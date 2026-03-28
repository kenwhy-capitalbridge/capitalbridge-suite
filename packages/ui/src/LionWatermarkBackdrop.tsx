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
   * Lion asset faces left; left-anchored marks flip so they look toward the page center.
   * Right-anchored marks stay unflipped (already facing inward).
   */
  flipX?: boolean;
} & (
  | { top: string; left: string; right?: never; bottom?: never }
  | { top: string; right: string; left?: never; bottom?: never }
  | { bottom: string; left: string; right?: never; top?: never }
  | { bottom: string; right: string; left?: never; top?: never }
);

function facesTowardCenter(m: MarkSpec): boolean {
  if ("left" in m && m.left !== undefined) return true;
  return false;
}

/**
 * Wide scatter: gutters + mid-field, uneven vertical rhythm, varied rotation.
 * (Plain 1–2% alpha on #0d3a1d is effectively invisible — see opacity + soft-light in CSS.)
 */
const LION_WATERMARK_MARKS: readonly MarkSpec[] = [
  { top: "9%", left: "-5%", widthPx: 232, rotateDeg: -21, opacity: 0.078 },
  { top: "31%", left: "3%", widthPx: 198, rotateDeg: 34, opacity: 0.062 },
  { top: "58%", left: "-7%", widthPx: 218, rotateDeg: 7, opacity: 0.07, translate: "0, -50%" },
  { bottom: "22%", left: "1%", widthPx: 244, rotateDeg: -14, opacity: 0.082 },
  { top: "44%", left: "11%", widthPx: 176, rotateDeg: 41, opacity: 0.055 },

  { top: "14%", right: "-4%", widthPx: 226, rotateDeg: 18, opacity: 0.075 },
  { top: "67%", right: "-6%", widthPx: 208, rotateDeg: -24, opacity: 0.068, translate: "0, -50%" },
  { bottom: "16%", right: "2%", widthPx: 236, rotateDeg: 12, opacity: 0.08 },
  { top: "52%", right: "9%", widthPx: 184, rotateDeg: -9, opacity: 0.056 },
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
  const flip = m.flipX ?? facesTowardCenter(m);
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
