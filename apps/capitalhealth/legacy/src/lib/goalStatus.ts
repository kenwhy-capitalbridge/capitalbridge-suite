/**
 * Shared goal status classification for both Growth and Withdrawal modes.
 * Growth: progressPct = capitalAtHorizon / targetCapital * 100
 * Withdrawal: coveragePct = sustainableIncome / targetIncome * 100
 */

export type GoalStatusKey = 'on_track' | 'close' | 'off_target';

/**
 * Classify a ratio (in %) into discrete status tiers.
 */
export function classifyStatus(ratioPct: number): GoalStatusKey {
  if (!Number.isFinite(ratioPct)) return 'off_target';
  if (ratioPct >= 100) return 'on_track';
  if (ratioPct >= 90) return 'close';
  return 'off_target';
}
