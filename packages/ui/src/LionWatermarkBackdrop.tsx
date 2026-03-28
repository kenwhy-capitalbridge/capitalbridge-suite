import { BRAND_LIONHEAD_GOLD } from "./brandPaths";

type MarkSpec = {
  top: string;
  left: string;
  widthPx: number;
  rotateDeg: number;
  opacity: number;
};

/**
 * Hand-placed “scatter” so it feels random without SSR/hydration mismatch.
 * Tune opacity (≈0.03–0.08) and positions here only.
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "-7%", left: "-11%", widthPx: 400, rotateDeg: -20, opacity: 0.068 },
  { top: "6%", left: "62%", widthPx: 340, rotateDeg: 16, opacity: 0.055 },
  { top: "32%", left: "-8%", widthPx: 380, rotateDeg: -10, opacity: 0.048 },
  { top: "48%", left: "70%", widthPx: 360, rotateDeg: 22, opacity: 0.058 },
  { top: "68%", left: "8%", widthPx: 300, rotateDeg: -14, opacity: 0.042 },
  { top: "82%", left: "72%", widthPx: 320, rotateDeg: 9, opacity: 0.05 },
  { top: "18%", left: "26%", widthPx: 200, rotateDeg: 31, opacity: 0.032 },
];

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
            top: m.top,
            left: m.left,
            width: m.widthPx,
            opacity: m.opacity,
            transform: `rotate(${m.rotateDeg}deg)`,
          }}
        />
      ))}
    </div>
  );
}
