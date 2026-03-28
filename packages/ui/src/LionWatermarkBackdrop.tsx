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

const MARK_COUNT = 4;
const TOP_RANGE_LO = 7;
const TOP_RANGE_HI = 83;
const LEFT_RANGE_LO = 3;
const LEFT_RANGE_HI = 97;

const WIDTH_PX_MIN = 150;
const WIDTH_PX_MAX = 260;
const OPACITY_MIN = 0.026;
const OPACITY_MAX = 0.044;

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
  return 16 + avg / 18;
}

function farEnough(a: MarkSpec, b: MarkSpec): boolean {
  const dx = a.leftPct - b.leftPct;
  const dy = a.topPct - b.topPct;
  return Math.hypot(dx, dy) >= separationThresholdPx(a.widthPx, b.widthPx);
}

function tryOneMark(existing: MarkSpec[]): MarkSpec | null {
  for (let i = 0; i < 90; i++) {
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
    { leftPct: 12, topPct: 22, widthPx: 185, rotateDeg: -10, opacity: 0.034 },
    { leftPct: 78, topPct: 28, widthPx: 175, rotateDeg: 14, opacity: 0.032 },
    { leftPct: 38, topPct: 58, widthPx: 195, rotateDeg: 8, opacity: 0.033 },
    { leftPct: 88, topPct: 72, widthPx: 168, rotateDeg: -16, opacity: 0.031 },
  ];
}

function generateLionWatermarkMarks(): MarkSpec[] {
  for (let attempt = 0; attempt < 550; attempt++) {
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
