import type { LionScoreTier } from '../lionsVerdict/types';
import type { LionPublicVerdictStatus } from '../lionsVerdict/lionScoreMapping';

/** Shown under the score for Critical, Weak, and Moderate. */
export const CLIENT_SCORE_TAGLINE_NON_STRONG =
  'You are closer than you think — but not there yet.' as const;

/** Shown under the score for Strong and Very Strong. */
export const CLIENT_SCORE_TAGLINE_STRONG =
  'You are in a strong position — now optimise further.' as const;

/** Strong = Lion tiers Strong | Very Strong (all other tiers use the non-strong line). */
export function isClientScoreStrongStatus(status: LionScoreTier): boolean {
  return status === 'Strong' || status === 'Very Strong';
}

export function getClientScoreDashboardTagline(status: LionScoreTier): string {
  return isClientScoreStrongStatus(status) ? CLIENT_SCORE_TAGLINE_STRONG : CLIENT_SCORE_TAGLINE_NON_STRONG;
}

/** Capital Health risk tier 1–5 → strong copy when tier is 1 or 2. */
export function clientScoreStrongFromHealthRiskTier(tier: 1 | 2 | 3 | 4 | 5): boolean {
  return tier === 1 || tier === 2;
}

export function getClientScoreDashboardTaglineFromHealthTier(tier: 1 | 2 | 3 | 4 | 5): string {
  return clientScoreStrongFromHealthRiskTier(tier) ? CLIENT_SCORE_TAGLINE_STRONG : CLIENT_SCORE_TAGLINE_NON_STRONG;
}

/** Public Lion status (STRONG … NOT_SUSTAINABLE) — STRONG uses the “optimise” line. */
export function getClientScoreDashboardTaglineFromPublicStatus(status: LionPublicVerdictStatus): string {
  return status === 'STRONG' ? CLIENT_SCORE_TAGLINE_STRONG : CLIENT_SCORE_TAGLINE_NON_STRONG;
}
