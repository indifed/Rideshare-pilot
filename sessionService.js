import { nanoid } from "nanoid";
import { prisma } from "../db.js";
import { HttpError } from "../utils/errors.js";
import { computeRewardCents, RULE_VERSION } from "./rules.js";

const TOKEN_TTL_MINUTES = 60;

function now() { return new Date(); }
function addMinutes(d, mins) { return new Date(d.getTime() + mins * 60_000); }

export async function createSession({ tenantId, riderId, deviceId, city }) {
  const session = await prisma.rideSession.create({
    data: { tenantId, riderId, deviceId: deviceId ?? null, city }
  });
  await prisma.pilotEvent.create({
    data: { tenantId, sessionId: session.id, type: "SESSION_CREATED", payload: { riderId, city } }
  });
  return session;
}

export async function startSession({ tenantId, sessionId }) {
  const session = await prisma.rideSession.findFirst({ where: { id: sessionId, tenantId } });
  if (!session) throw new HttpError(404, "Session not found", "NOT_FOUND");
  if (session.status !== "CREATED") throw new HttpError(409, "Session not in CREATED state", "INVALID_STATE");

  const startedAt = now();
  const updated = await prisma.rideSession.update({
    where: { id: session.id },
    data: { status: "STARTED", startedAt, engagementStatus: "IN_PROGRESS" }
  });

  await prisma.pilotEvent.create({
    data: { tenantId, sessionId, type: "SESSION_STARTED", payload: { startedAt: startedAt.toISOString() } }
  });

  return updated;
}

export async function submitEngagement({ tenantId, sessionId, engagementScore, details }) {
  const session = await prisma.rideSession.findFirst({ where: { id: sessionId, tenantId } });
  if (!session) throw new HttpError(404, "Session not found", "NOT_FOUND");
  if (session.status !== "STARTED") throw new HttpError(409, "Session must be STARTED", "INVALID_STATE");
  if (session.engagementStatus === "COMPLETED") throw new HttpError(409, "Engagement already completed", "INVALID_STATE");

  if (!Number.isInteger(engagementScore) || engagementScore < 0 || engagementScore > 100) {
    throw new HttpError(400, "engagementScore must be int 0..100", "VALIDATION");
  }

  const updated = await prisma.rideSession.update({
    where: { id: session.id },
    data: { engagementStatus: "COMPLETED", engagementScore }
  });

  await prisma.pilotEvent.create({
    data: { tenantId, sessionId, type: "ENGAGEMENT_COMPLETED", payload: { engagementScore, details: details ?? null } }
  });

  return updated;
}

export async function endSessionAndIssueReward({ tenantId, sessionId }) {
  // Atomic: end session + issue at most one token for session
  return await prisma.$transaction(async (tx) => {
    const session = await tx.rideSession.findFirst({ where: { id: sessionId, tenantId }, include: { tokens: true } });
    if (!session) throw new HttpError(404, "Session not found", "NOT_FOUND");
    if (session.status !== "STARTED") throw new HttpError(409, "Session must be STARTED to end", "INVALID_STATE");
    if (session.engagementStatus !== "COMPLETED") throw new HttpError(409, "Engagement must be COMPLETED", "INVALID_STATE");
    if (session.tokens.length > 0) throw new HttpError(409, "Reward already issued for session", "DUP_REWARD");

    const endedAt = now();
    await tx.rideSession.update({
      where: { id: session.id },
      data: { status: "ENDED", endedAt }
    });

    const valueCents = computeRewardCents({ engagementScore: session.engagementScore ?? 0 });
    await tx.pilotEvent.create({
      data: { tenantId, sessionId, type: "SESSION_ENDED", payload: { endedAt: endedAt.toISOString() } }
    });

    if (valueCents <= 0) {
      await tx.pilotEvent.create({
        data: { tenantId, sessionId, type: "REWARD_NOT_ISSUED", payload: { reason: "score_too_low" } }
      });
      return { issued: false, valueCents: 0, token: null };
    }

    const token = nanoid(18);
    const issuedAt = now();
    const expiresAt = addMinutes(issuedAt, TOKEN_TTL_MINUTES);

    const reward = await tx.rewardToken.create({
      data: {
        tenantId,
        sessionId,
        token,
        status: "ISSUED",
        ruleVersion: RULE_VERSION,
        valueCents,
        issuedAt,
        expiresAt
      }
    });

    await tx.pilotEvent.create({
      data: { tenantId, sessionId, type: "REWARD_ISSUED", payload: { tokenId: reward.id, valueCents, ruleVersion: RULE_VERSION, expiresAt: expiresAt.toISOString() } }
    });

    return { issued: true, valueCents, token: reward.token, tokenId: reward.id, expiresAt: reward.expiresAt };
  });
}
