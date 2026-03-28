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
 * Opacity ~0.012–0.026 — keep below ~0.03 for a light hint.
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "5%", left: "-7%", widthPx: 168, rotateDeg: -13, opacity: 0.02 },
  { top: "8%", right: "-6%", widthPx: 152, rotateDeg: 21, opacity: 0.017 },
  { top: "46%", left: "-11%", widthPx: 142, rotateDeg: 6, opacity: 0.014, translate: "0, -50%" },
  { top: "50%", right: "-10%", widthPx: 158, rotateDeg: -19, opacity: 0.016, translate: "0, -50%" },
  { bottom: "16%", left: "-5%", widthPx: 178, rotateDeg: 11, opacity: 0.022 },
  { bottom: "12%", right: "-7%", widthPx: 165, rotateDeg: -27, opacity: 0.018 },
  { top: "26%", left: "3%", widthPx: 128, rotateDeg: 38, opacity: 0.012 },
  { top: "34%", right: "4%", widthPx: 118, rotateDeg: -8, opacity: 0.013 },
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
