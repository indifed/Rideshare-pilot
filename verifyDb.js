/**
 * Minimal DB integrity checks for pilot:
 * - no session has >1 reward token
 * - all redeemed tokens have a redemption row
 * - offer redeemedCount matches actual redemption count (detect tampering)
 */
import { prisma } from "../db.js";
import { env } from "../utils/env.js";

async function main() {
  const tenantId = env.TENANT_ID;

  const multiToken = await prisma.rideSession.findMany({
    where: { tenantId },
    include: { tokens: true }
  });

  for (const s of multiToken) {
    if (s.tokens.length > 1) {
      console.log(`FAIL: session ${s.id} has ${s.tokens.length} tokens`);
      process.exit(1);
    }
  }

  const redeemed = await prisma.rewardToken.findMany({
    where: { tenantId, status: "REDEEMED" },
    include: { redemption: true }
  });

  for (const t of redeemed) {
    if (!t.redemption) {
      console.log(`FAIL: token ${t.id} REDEEMED but missing redemption row`);
      process.exit(1);
    }
  }

  const offers = await prisma.offer.findMany({ where: { tenantId } });
  for (const o of offers) {
    const count = await prisma.redemption.count({ where: { tenantId, offerId: o.id } });
    if (count !== o.redeemedCount) {
      console.log(`FAIL: offer ${o.id} redeemedCount=${o.redeemedCount} but actual=${count}`);
      process.exit(1);
    }
  }

  console.log("PASS: db invariants ok");
  process.exit(0);
}

main().catch((e) => { console.error("FAIL: verifier crashed", e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
