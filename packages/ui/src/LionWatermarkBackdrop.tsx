import type { CSSProperties } from "react";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";

type MarkSpec = {
  widthPx: number;
  rotateDeg: number;
  opacity: number;
  /** Fine-tune after position (keeps rotation centered on the mark). */
  translate?: string;
} & (
  | { top: string; left: string; right?: never; bottom?: never }
  | { top: string; right: string; left?: never; bottom?: never }
  | { bottom: string; left: string; right?: never; top?: never }
  | { bottom: string; right: string; left?: never; top?: never }
);

/**
 * Edge- and corner-anchored scatter: faint, non-overlapping “zones” (corners + mid-edges),
 * varied size/rotation so it reads random without SSR/client randomness.
 * Used on Forever, Income Engineering, Capital Health, and Capital Stress model layouts only.
 * Not used on login (incl. access/pricing) or platform (dashboard, etc.).
 * Opacity ~0.01–0.018 — larger marks, slightly softer than small-tile era.
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "5%", left: "-8%", widthPx: 248, rotateDeg: -13, opacity: 0.016 },
  { top: "7%", right: "-7%", widthPx: 228, rotateDeg: 21, opacity: 0.014 },
  { top: "46%", left: "-12%", widthPx: 212, rotateDeg: 6, opacity: 0.011, translate: "0, -50%" },
  { top: "50%", right: "-11%", widthPx: 232, rotateDeg: -19, opacity: 0.012, translate: "0, -50%" },
  { bottom: "14%", left: "-6%", widthPx: 262, rotateDeg: 11, opacity: 0.018 },
  { bottom: "10%", right: "-8%", widthPx: 242, rotateDeg: -27, opacity: 0.015 },
  { top: "24%", left: "2%", widthPx: 188, rotateDeg: 38, opacity: 0.01 },
  { top: "32%", right: "3%", widthPx: 176, rotateDeg: -8, opacity: 0.01 },
];

function positionStyle(m: MarkSpec): CSSProperties {
  const base: CSSProperties = { width: m.widthPx };
  if ("top" in m && m.top !== undefined) base.top = m.top;
  if ("left" in m && m.left !== undefined) base.left = m.left;
  if ("right" in m && m.right !== undefined) base.right = m.right;
  if ("bottom" in m && m.bottom !== undefined) base.bottom = m.bottom;
  return base;
}

/**
 * Subtle full-viewport lion marks behind the app. Uses `/brand/lionhead_Gold.svg`
 * (synced from `packages/ui/src/assets/lionhead_Gold.svg`).
 *
 * Intended for the four calculator apps’ root layouts (Forever, Income Engineering,
 * Capital Health, Capital Stress). Omit on login and platform apps.
 *
 * Pair with a sibling wrapper `className="relative z-[1] min-h-screen"` so content
 * stacks above this layer (`z-index: 0` fixed can paint over in-flow content otherwise).
 */
export function LionWatermarkBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden"
      aria-hidden
    >
      {LION_WATERMARK_MARKS.map((m, i) => (
        <img
          key={i}
          src={BRAND_LIONHEAD_GOLD}
          alt=""
          width={m.widthPx}
          height={m.widthPx}
          decoding="async"
          className="absolute h-auto max-w-none select-none"
          style={{
            ...positionStyle(m),
            opacity: m.opacity,
            transform: `translate(${m.translate ?? "0, 0"}) rotate(${m.rotateDeg}deg)`,
            transformOrigin: "center center",
          }}
        />
      ))}
    </div>
  );
}
