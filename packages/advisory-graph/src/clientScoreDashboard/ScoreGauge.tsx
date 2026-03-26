import type { LionScoreTier } from '../lionsVerdict/types';
import { REPORT_BRAND_GREEN } from '../reports/tokens';

const GREEN = REPORT_BRAND_GREEN;
const GOLD = '#C6A24D';
const AMBER = '#b8860b';
const RED = '#b91c1c';

function gaugeColor(tier: LionScoreTier): string {
  if (tier === 'Very Strong' || tier === 'Strong') return GREEN;
  if (tier === 'Moderate') return GOLD;
  if (tier === 'Weak') return AMBER;
  return RED;
}

export type ScoreGaugeProps = {
  value0to100: number;
  tier: LionScoreTier;
  ariaLabel?: string;
};

/**
 * Semicircular gauge (0–100). Stroke fill follows tier accent for quick read.
 */
export function ScoreGauge({ value0to100, tier, ariaLabel }: ScoreGaugeProps) {
  const v = Math.min(100, Math.max(0, value0to100));
  const stroke = gaugeColor(tier);
  const r = 88;
  const cx = 100;
  const cy = 100;
  const arcLen = Math.PI * r;
  const dash = (v / 100) * arcLen;

  return (
    <svg
      width={200}
      height={112}
      viewBox="0 0 200 112"
      role="img"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={ariaLabel ?? `Score ${Math.round(v)} out of 100`}
    >
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(13, 58, 29, 0.12)"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={stroke}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${arcLen}`}
        style={{ transition: 'stroke-dasharray 0.35s ease' }}
      />
    </svg>
  );
}
