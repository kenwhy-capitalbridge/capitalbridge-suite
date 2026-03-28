import type { CSSProperties } from "react";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";
import styles from "./LionWatermarkBackdrop.module.css";

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
 * Edge- and corner-anchored scatter. Opacity tuned for dark green + soft-light blend
 * (plain 1–2% alpha on #0d3a1d is effectively invisible).
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "5%", left: "-8%", widthPx: 248, rotateDeg: -13, opacity: 0.09 },
  { top: "7%", right: "-7%", widthPx: 228, rotateDeg: 21, opacity: 0.08 },
  { top: "46%", left: "-12%", widthPx: 212, rotateDeg: 6, opacity: 0.065, translate: "0, -50%" },
  { top: "50%", right: "-11%", widthPx: 232, rotateDeg: -19, opacity: 0.07, translate: "0, -50%" },
  { bottom: "14%", left: "-6%", widthPx: 262, rotateDeg: 11, opacity: 0.1 },
  { bottom: "10%", right: "-8%", widthPx: 242, rotateDeg: -27, opacity: 0.085 },
  { top: "24%", left: "2%", widthPx: 188, rotateDeg: 38, opacity: 0.055 },
  { top: "32%", right: "3%", widthPx: 176, rotateDeg: -8, opacity: 0.055 },
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
 * Gold lion watermarks for Forever / Income Engineering / Capital Health / Capital Stress.
 * Renders **inside** the app `relative min-h-screen` shell (first child) so stacking matches
 * the calculator. `z-index: 0` sits under the UI shell (`relative z-10`). Uses CSS module positioning
 * so production builds don’t drop arbitrary Tailwind classes.
 */
export function LionWatermarkBackdrop() {
  return (
    <div className={`${styles.root} print:hidden`} aria-hidden>
      {LION_WATERMARK_MARKS.map((m, i) => (
        <img
          key={i}
          src={BRAND_LIONHEAD_GOLD}
          alt=""
          width={m.widthPx}
          height={m.widthPx}
          decoding="async"
          className={styles.mark}
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
