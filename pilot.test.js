import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { computeRewardCents } from "../src/services/rules.js";

test("reward buckets deterministic", () => {
  assert.equal(computeRewardCents({ engagementScore: 0 }), 0);
  assert.equal(computeRewardCents({ engagementScore: 55 }), 100);
  assert.equal(computeRewardCents({ engagementScore: 70 }), 200);
  assert.equal(computeRewardCents({ engagementScore: 90 }), 300);
});

test("db connectivity (requires DATABASE_URL)", async () => {
  const prisma = new PrismaClient();
  const now = await prisma.$queryRaw`SELECT NOW() as now`;
  assert.ok(now);
  await prisma.$disconnect();
});
