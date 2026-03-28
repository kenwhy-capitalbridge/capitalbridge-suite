"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";
import styles from "./LionWatermarkBackdrop.module.css";

type MarkSpec = {
  /** Horizontal center of the mark (% of backdrop width). */
  leftPct: number;
  /** Vertical center of the mark (% of backdrop height below header). */
  topPct: number;
  widthPx: number;
  rotateDeg: number;
  opacity: number;
};

const MARK_COUNT = 6;
const TOP_RANGE_LO = 7;
const TOP_RANGE_HI = 83;
const LEFT_RANGE_LO = 3;
const LEFT_RANGE_HI = 97;

const WIDTH_PX_MIN = 112;
const WIDTH_PX_MAX = 218;
const OPACITY_MIN = 0.034;
const OPACITY_MAX = 0.056;

function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * Minimum center-to-center distance (%), scaled by mark size so larger lions stay apart.
 * Uses a ~900px-wide reference; good enough for overlap avoidance without measuring the viewport.
 */
function separationThresholdPx(wa: number, wb: number): number {
  const avg = (wa + wb) / 2;
  return 11 + avg / 26;
}

function farEnough(a: MarkSpec, b: MarkSpec): boolean {
  const dx = a.leftPct - b.leftPct;
  const dy = a.topPct - b.topPct;
  return Math.hypot(dx, dy) >= separationThresholdPx(a.widthPx, b.widthPx);
}

function tryOneMark(existing: MarkSpec[]): MarkSpec | null {
  for (let i = 0; i < 70; i++) {
    const m: MarkSpec = {
      leftPct: randomBetween(LEFT_RANGE_LO, LEFT_RANGE_HI),
      topPct: randomBetween(TOP_RANGE_LO, TOP_RANGE_HI),
      widthPx: Math.round(randomBetween(WIDTH_PX_MIN, WIDTH_PX_MAX)),
      rotateDeg: Math.round(randomBetween(-21, 21)),
      opacity: randomBetween(OPACITY_MIN, OPACITY_MAX),
    };
    if (existing.every((e) => farEnough(m, e))) return m;
  }
  return null;
}

/** Sparse fallback if random placement fails (should be rare). */
function fallbackMarks(): MarkSpec[] {
  return [
    { leftPct: 9, topPct: 16, widthPx: 155, rotateDeg: -12, opacity: 0.042 },
    { leftPct: 46, topPct: 36, widthPx: 138, rotateDeg: 9, opacity: 0.04 },
    { leftPct: 91, topPct: 19, widthPx: 162, rotateDeg: 14, opacity: 0.044 },
    { leftPct: 26, topPct: 56, widthPx: 148, rotateDeg: -17, opacity: 0.041 },
    { leftPct: 74, topPct: 51, widthPx: 172, rotateDeg: -7, opacity: 0.043 },
    { leftPct: 58, topPct: 76, widthPx: 142, rotateDeg: 19, opacity: 0.04 },
  ];
}

function generateLionWatermarkMarks(): MarkSpec[] {
  for (let attempt = 0; attempt < 450; attempt++) {
    const marks: MarkSpec[] = [];
    let ok = true;
    for (let n = 0; n < MARK_COUNT; n++) {
      const m = tryOneMark(marks);
      if (!m) {
        ok = false;
        break;
      }
      marks.push(m);
    }
    if (ok) return marks;
  }
  return fallbackMarks();
}

/**
 * Gold lion asset faces right. Centers on the right half of the width flip so the nose points
 * toward the horizontal middle (inward).
 */
function buildTransform(m: MarkSpec): string {
  const flip = m.leftPct >= 50;
  const sx = flip ? -1 : 1;
  return `translate(-50%, -50%) rotate(${m.rotateDeg}deg) scaleX(${sx})`;
}

function positionStyle(m: MarkSpec): CSSProperties {
  return {
    left: pct(m.leftPct),
    top: pct(m.topPct),
    width: m.widthPx,
  };
}

/**
 * Gold lion watermarks for Forever / Income Engineering / Capital Health / Capital Stress.
 * Random positions across full width and height band; some sit under center content by design.
 * Regenerates on pathname change. Client-only so SSR never sees `Math.random()`.
 */
export function LionWatermarkBackdrop() {
  const pathname = usePathname();
  const [marks, setMarks] = useState<MarkSpec[]>([]);

  useEffect(() => {
    setMarks(generateLionWatermarkMarks());
  }, [pathname]);

  return (
    <div className={`${styles.root} print:hidden`} aria-hidden>
      {marks.map((m, i) => (
        <img
          key={`${pathname}-${i}`}
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
