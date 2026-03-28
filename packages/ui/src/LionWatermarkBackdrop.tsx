import type { CSSProperties } from "react";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";
import styles from "./LionWatermarkBackdrop.module.css";

type MarkSpec = {
  widthPx: number;
  rotateDeg: number;
  opacity: number;
  /** Fine-tune after position (keeps rotation centered on the mark). */
  translate?: string;
  /**
   * Gold lion asset faces right. Left-anchored = unflipped (nose toward center).
   * Right-anchored = mirror so nose points left toward center.
   */
  flipX?: boolean;
} & (
  | { top: string; left: string; right?: never; bottom?: never }
  | { top: string; right: string; left?: never; bottom?: never }
  | { bottom: string; left: string; right?: never; top?: never }
  | { bottom: string; right: string; left?: never; top?: never }
);

/** Default: mirror only right-edge marks so both sides appear to face the middle. */
function flipTowardCenterByDefault(m: MarkSpec): boolean {
  return "right" in m && m.right !== undefined;
}

/**
 * Six marks in alternating vertical bands (~25%+ between centers) so silhouettes
 * do not stack. Smaller widths reduce rotational overlap at the margins.
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "12%", left: "-4%", widthPx: 168, rotateDeg: -16, opacity: 0.076 },
  { top: "40%", left: "2%", widthPx: 158, rotateDeg: 24, opacity: 0.065 },
  { top: "70%", left: "-5%", widthPx: 172, rotateDeg: 9, opacity: 0.072 },

  { top: "20%", right: "-3%", widthPx: 166, rotateDeg: 14, opacity: 0.074 },
  { top: "48%", right: "3%", widthPx: 154, rotateDeg: -20, opacity: 0.064 },
  { top: "78%", right: "-4%", widthPx: 170, rotateDeg: -11, opacity: 0.07 },
];

function positionStyle(m: MarkSpec): CSSProperties {
  const base: CSSProperties = { width: m.widthPx };
  if ("top" in m && m.top !== undefined) base.top = m.top;
  if ("left" in m && m.left !== undefined) base.left = m.left;
  if ("right" in m && m.right !== undefined) base.right = m.right;
  if ("bottom" in m && m.bottom !== undefined) base.bottom = m.bottom;
  return base;
}

function buildTransform(m: MarkSpec): string {
  const t = m.translate ?? "0, 0";
  const flip = m.flipX ?? flipTowardCenterByDefault(m);
  const sx = flip ? -1 : 1;
  return `translate(${t}) rotate(${m.rotateDeg}deg) scaleX(${sx})`;
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
            transform: buildTransform(m),
            transformOrigin: "center center",
          }}
        />
      ))}
    </div>
  );
}
