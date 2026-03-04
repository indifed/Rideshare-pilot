import { prisma } from "../db.js";
import { stringify } from "csv-stringify/sync";

export async function summaryMetrics({ tenantId, sinceDays = 30 }) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const [sessions, completedEngagement, tokensIssued, redemptions] = await Promise.all([
    prisma.rideSession.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.rideSession.count({ where: { tenantId, engagementStatus: "COMPLETED", createdAt: { gte: since } } }),
    prisma.rewardToken.count({ where: { tenantId, status: { in: ["ISSUED", "REDEEMED"] }, issuedAt: { gte: since } } }),
    prisma.redemption.count({ where: { tenantId, createdAt: { gte: since } } })
  ]);

  return {
    since: since.toISOString(),
    sessions,
    completedEngagement,
    engagementCompletionRate: sessions ? Number((completedEngagement / sessions).toFixed(4)) : 0,
    tokensIssued,
    redemptions
  };
}

export async function exportSessionsCsv({ tenantId, from, to }) {
  const where = { tenantId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const rows = await prisma.rideSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { tokens: true }
  });

  const flat = rows.map(r => ({
    sessionId: r.id,
    riderId: r.riderId,
    city: r.city,
    status: r.status,
    engagementStatus: r.engagementStatus,
    engagementScore: r.engagementScore ?? "",
    startedAt: r.startedAt?.toISOString() ?? "",
    endedAt: r.endedAt?.toISOString() ?? "",
    token: r.tokens[0]?.token ?? "",
    tokenStatus: r.tokens[0]?.status ?? "",
    tokenValueCents: r.tokens[0]?.valueCents ?? "",
    createdAt: r.createdAt.toISOString()
  }));

  return stringify(flat, { header: true });
}
