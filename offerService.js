import { prisma } from "../db.js";
import { HttpError } from "../utils/errors.js";

export async function listActiveOffers({ tenantId, city }) {
  return prisma.offer.findMany({
    where: {
      tenantId,
      city,
      isActive: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function createOffer({ tenantId, title, category, city, startsAt, endsAt, maxRedemptions }) {
  if (maxRedemptions !== null && maxRedemptions !== undefined && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    throw new HttpError(400, "maxRedemptions must be int >= 1 or null", "VALIDATION");
  }
  return prisma.offer.create({
    data: {
      tenantId,
      title,
      category,
      city,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      maxRedemptions: maxRedemptions ?? null
    }
  });
}

export async function toggleOffer({ tenantId, offerId, isActive }) {
  const offer = await prisma.offer.findFirst({ where: { id: offerId, tenantId } });
  if (!offer) throw new HttpError(404, "Offer not found", "NOT_FOUND");
  return prisma.offer.update({ where: { id: offerId }, data: { isActive: !!isActive } });
}
