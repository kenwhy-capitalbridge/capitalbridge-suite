/**
 * Centralized copy for advisory (Lion's Verdict) by Capital Risk Level (5 tiers).
 * Keeps language aligned across Growth and Withdrawal modes.
 * Tier 1 = Very Strong, 2 = Strong, 3 = Moderate, 4 = Weak, 5 = Critical.
 */

export type RiskTierKey = 1 | 2 | 3 | 4 | 5;

type CopyEntry = { short: string; headline: string; long: string };
type ModeCopy = Record<RiskTierKey, CopyEntry>;

export const STATUS_COPY: { growth: ModeCopy; withdrawal: ModeCopy } = {
  withdrawal: {
    1: {
      short: 'VERY STRONG',
      headline: 'The lion is still. Income is carried by returns.',
      long: 'Target income is fully supported by the current structure. Capital is preserved under present assumptions.',
    },
    2: {
      short: 'STRONG',
      headline: 'The lion stands steady. The load is well borne.',
      long: 'Sustainable with limited buffer. Strengthen one pillar—top-ups, return, or timing—to add durability.',
    },
    3: {
      short: 'MODERATE',
      headline: 'The lion watches. Preserve the principal.',
      long: 'Nearly sustainable. A minor adjustment can prevent depletion and keep capital intact.',
    },
    4: {
      short: 'WEAK',
      headline: 'The lion signals caution. Strain is visible.',
      long: 'Unsustainable at target income. Withdraw less, add capital/top-ups, or improve returns to restore stability.',
    },
    5: {
      short: 'CRITICAL',
      headline: 'The lion warns. Reinforce before strain.',
      long: 'Highly unsustainable. Substantial reductions in withdrawals and/or material increases in capital or returns are required to avoid depletion.',
    },
  },
  growth: {
    1: {
      short: 'VERY STRONG',
      headline: 'The lion rests. The ground is firm.',
      long: 'On course to reach target by the horizon. The structure holds; maintain discipline and avoid unnecessary strain.',
    },
    2: {
      short: 'STRONG',
      headline: 'The lion stands watch. The structure is sound.',
      long: 'Well positioned with healthy buffers. Small lifts in top-ups, returns, or time will add resilience.',
    },
    3: {
      short: 'MODERATE',
      headline: 'The lion is alert. Balance holds for now.',
      long: 'Workable but exposed. Modest increases in top-ups or return, or a longer horizon, can bridge the gap.',
    },
    4: {
      short: 'WEAK',
      headline: 'The lion shifts. The ground begins to give.',
      long: 'Off target. Reinforce the structure with higher top-ups, an extended horizon, or improved returns.',
    },
    5: {
      short: 'CRITICAL',
      headline: 'The lion rises. Survival comes first.',
      long: 'Significantly off target. The structure requires meaningful reinforcement—raise top-ups, extend horizon, or improve returns materially.',
    },
  },
} as const;

/** Pill/status colors by Capital Risk Level (tier 1–5). Matches RiskTierBadge. */
export const TIER_COLORS: Record<RiskTierKey, string> = {
  1: '#55B685',
  2: '#9BCF8E',
  3: '#F3AF56',
  4: '#D9A441',
  5: '#CD5B52',
};
