/**
 * Deterministic reward rule v1.
 * - ruleVersion pinned
 * - input is only engagementScore (0..100)
 * - output fixed cents with caps
 */
export const RULE_VERSION = "v1.0";

export function computeRewardCents({ engagementScore }) {
  // Deterministic buckets:
  // 0-49: 0
  // 50-69: 100
  // 70-84: 200
  // 85-100: 300
  if (engagementScore < 50) return 0;
  if (engagementScore < 70) return 100;
  if (engagementScore < 85) return 200;
  return 300;
}
