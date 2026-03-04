import { prisma } from "../db.js";
import { HttpError } from "../utils/errors.js";

export async function redeemToken({ tenantId, token, offerId }) {
  const reward = await prisma.rewardToken.findFirst({
    where: { tenantId, token },
    include: { session: true, redemption: true }
  });
  if (!reward) throw new HttpError(404, "Token not found", "NOT_FOUND");
  if (reward.status !== "ISSUED") throw new HttpError(409, "Token not in ISSUED state", "INVALID_STATE");
  if (reward.redemption) throw new HttpError(409, "Token already redeemed", "INVALID_STATE");
  if (reward.expiresAt.getTime() < Date.now()) throw new HttpError(409, "Token expired", "TOKEN_EXPIRED");

  const offer = await prisma.offer.findFirst({ where: { id: offerId, tenantId } });
  if (!offer) throw new HttpError(404, "Offer not found", "NOT_FOUND");
  if (!offer.isActive) throw new HttpError(409, "Offer is inactive", "OFFER_INACTIVE");
  if (offer.city !== reward.session.city) throw new HttpError(409, "Offer city mismatch", "OFFER_CITY_MISMATCH");

  // enforce maxRedemptions
  if (offer.maxRedemptions !== null && offer.redeemedCount >= offer.maxRedemptions) {
    throw new HttpError(409, "Offer sold out", "OFFER_SOLD_OUT");
  }

  // Atomic redemption: create redemption + mark token + increment offer count
  return await prisma.$transaction(async (tx) => {
    // re-read with FOR UPDATE semantics not directly in Prisma; but transaction + unique constraints handle most cases
    const reward2 = await tx.rewardToken.findFirst({
      where: { id: reward.id, tenantId },
      include: { redemption: true, session: true }
    });
    if (!reward2) throw new HttpError(404, "Token not found", "NOT_FOUND");
    if (reward2.status !== "ISSUED" || reward2.redemption) throw new HttpError(409, "Token already used", "INVALID_STATE");
    if (reward2.expiresAt.getTime() < Date.now()) throw new HttpError(409, "Token expired", "TOKEN_EXPIRED");

    const offer2 = await tx.offer.findFirst({ where: { id: offerId, tenantId } });
    if (!offer2 || !offer2.isActive) throw new HttpError(409, "Offer unavailable", "OFFER_UNAVAILABLE");
    if (offer2.maxRedemptions !== null && offer2.redeemedCount >= offer2.maxRedemptions) {
      throw new HttpError(409, "Offer sold out", "OFFER_SOLD_OUT");
    }

    const redemption = await tx.redemption.create({
      data: {
        tenantId,
        tokenId: reward2.id,
        offerId: offer2.id,
        riderId: reward2.session.riderId,
        sessionId: reward2.sessionId
      }
    });

    await tx.rewardToken.update({
      where: { id: reward2.id },
      data: { status: "REDEEMED", redeemedAt: new Date() }
    });

    await tx.offer.update({
      where: { id: offer2.id },
      data: { redeemedCount: { increment: 1 } }
    });

    await tx.pilotEvent.create({
      data: { tenantId, sessionId: reward2.sessionId, type: "TOKEN_REDEEMED", payload: { offerId: offer2.id, redemptionId: redemption.id } }
    });

    return { redemptionId: redemption.id, valueCents: reward2.valueCents, offerTitle: offer2.title };
  });
}
