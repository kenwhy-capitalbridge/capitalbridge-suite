/**
 * Capital Strength Bar — compact horizontal strength bar for risk dashboard.
 * Replaces semi-circle gauge; uses tier colors from statusCopy.
 * Left = Critical (low score), Right = Very Strong (high score).
 */

import React from 'react';

export type CapitalStrengthBarProps = {
  score: number;
  tier: 1 | 2 | 3 | 4 | 5;
};

/** Segment colors left→right: Critical (0-29%), Weak (30-54%), Moderate (55-74%), Strong (75-89%), Very Strong (90-100%) */
const SEGMENT_COLORS = ['#CD5B52', '#D9A441', '#F3AF56', '#9BCF8E', '#55B685'] as const;

/** Segment width % to match tier ranges: 0-29, 30-54, 55-74, 75-89, 90-100 */
const SEGMENT_WIDTHS = [29, 25, 20, 15, 11] as const;

/** Glow color by tier (tier 1 = Very Strong, tier 5 = Critical) */
const TIER_GLOW: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#55B685',
  2: '#9BCF8E',
  3: '#F3AF56',
  4: '#D9A441',
  5: '#CD5B52',
};

const LABELS = ['CRITICAL', 'WEAK', 'MODERATE', 'STRONG', 'VERY STRONG'];

export function CapitalStrengthBar({ score, tier }: CapitalStrengthBarProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const glowColor = TIER_GLOW[tier];
  const isCritical = tier === 5;

  return (
    <div
      className="w-full mt-1 mb-2 sm:mt-1.5 sm:mb-3"
      aria-hidden
    >
      <div
        className="strength-bar relative w-full rounded-full overflow-visible h-2 sm:h-2.5"
      >
        <div className="segments flex w-full h-full rounded-full overflow-hidden">
          {SEGMENT_COLORS.map((color, i) => (
            <div
              key={i}
              className="segment h-full flex-shrink-0"
              style={{
                width: `${SEGMENT_WIDTHS[i]}%`,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
        <div
          className="indicator-dot absolute top-1/2 rounded-full border-2 border-white -translate-y-1/2 z-10 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5"
          style={{
            left: `${clampedScore}%`,
            background: '#F3C969',
            transform: 'translateX(-50%) translateY(-50%)',
            transition: 'left 0.6s ease',
            boxShadow: isCritical
              ? `0 0 6px ${glowColor}, 0 0 14px ${glowColor}`
              : `0 0 6px ${glowColor}, 0 0 14px ${glowColor}`,
            animation: isCritical ? 'criticalPulse 2s infinite ease-in-out' : undefined,
          }}
        />
      </div>
      <div className="hidden md:flex w-full mt-1 justify-between gap-0">
        {LABELS.map((label, i) => {
          const isRed = i <= 1;
          const isAmber = i === 2;
          const isGreen = i >= 3;
          const labelColor = isRed ? '#CD5B52' : isAmber ? '#F3AF56' : '#55B685';
          return (
            <div
              key={label}
              className="flex justify-center items-center flex-shrink-0 text-center"
              style={{ width: `${SEGMENT_WIDTHS[i]}%` }}
            >
              <span
                className="uppercase tracking-tight block text-center font-medium whitespace-nowrap"
                style={{ fontSize: 'clamp(4px, 0.7vw, 7px)', color: labelColor }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
