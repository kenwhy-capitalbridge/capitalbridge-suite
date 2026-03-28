"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";
import { useLionWatermarkDynamics } from "./lionWatermarkDynamics";
import styles from "./LionWatermarkBackdrop.module.css";

const MARK_GRID = 4;
const LEFT_RANGE_LO = 3;
const LEFT_RANGE_HI = 97;
const TOP_RANGE_LO = 7;
const TOP_RANGE_HI = 83;

/** Fill order: inside-out for even coverage as density increases. */
const CELL_FILL_PRIORITY: readonly number[] = [
  5, 6, 9, 10, 1, 2, 4, 7, 8, 11, 13, 14, 0, 3, 12, 15,
];

/** Row-major index → structural layer (depth + glow tier). */
function layerForCell(idx: number): "A" | "B" | "C" {
  const row = Math.floor(idx / MARK_GRID);
  if (row <= 1) return "A";
  if (row === 2) return "B";
  return "C";
}

function cellCenter(idx: number): { leftPct: number; topPct: number } {
  const col = idx % MARK_GRID;
  const row = Math.floor(idx / MARK_GRID);
  const left = LEFT_RANGE_LO + ((col + 0.5) / MARK_GRID) * (LEFT_RANGE_HI - LEFT_RANGE_LO);
  const top = TOP_RANGE_LO + ((row + 0.5) / MARK_GRID) * (TOP_RANGE_HI - TOP_RANGE_LO);
  return { leftPct: left, topPct: top };
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic structural rotation per anchor (static; not score-driven). */
function baseRotateDeg(idx: number): number {
  const x = (idx * 17 + idx * idx * 3) % 43;
  return x - 21;
}

/** ±0.5° max, deterministic per index. */
function scoreVarianceDeg(idx: number): number {
  const v = ((idx * 13 + 7) % 21) - 10;
  return (v / 10) * 0.5;
}

function zForLayer(layer: "A" | "B" | "C"): number {
  if (layer === "A") return 1;
  if (layer === "B") return 2;
  return 3;
}

const WIDTH_PX_MIN = 150;
const WIDTH_PX_MAX = 260;
const OPACITY_RISK_MIN = 0.02;
const OPACITY_RISK_MAX = 0.095;
const GLOBAL_OPACITY_CAP = 0.12;

const HERO_CELL_INDEX = 10;
const HERO_RISK_THRESHOLD = 0.45;
const HERO_WIDTH_MUL = 1.22;

const SCORE_TRANSITION = "transform 1s ease-in-out, opacity 1s ease-in-out, filter 1s ease-in-out";

type ActiveMark = {
  cellIndex: number;
  leftPct: number;
  topPct: number;
  layer: "A" | "B" | "C";
  widthPx: number;
  baseRot: number;
  flip: boolean;
};

function buildActiveMarks(count: number, riskNorm: number): ActiveMark[] {
  const n = Math.min(16, Math.max(4, count));
  const marks: ActiveMark[] = [];
  for (let i = 0; i < n; i++) {
    const cellIndex = CELL_FILL_PRIORITY[i]!;
    const { leftPct, topPct } = cellCenter(cellIndex);
    const layer = layerForCell(cellIndex);
    const baseW = Math.round(lerp(WIDTH_PX_MIN, WIDTH_PX_MAX, riskNorm));
    const hero = riskNorm >= HERO_RISK_THRESHOLD && cellIndex === HERO_CELL_INDEX;
    const widthPx = Math.round(hero ? baseW * HERO_WIDTH_MUL : baseW);
    marks.push({
      cellIndex,
      leftPct,
      topPct,
      layer,
      widthPx,
      baseRot: baseRotateDeg(cellIndex),
      flip: leftPct >= 50,
    });
  }
  return marks;
}

function glowForLayer(
  score01: number,
  layer: "A" | "B" | "C",
): { blurPx: number; alpha: number } {
  const blur = lerp(0, 6, score01);
  const alphaBase = lerp(0, 0.12, score01);
  const layerMul = layer === "C" ? 1 : layer === "B" ? 0.85 : 0.55;
  return { blurPx: blur, alpha: alphaBase * layerMul };
}

/**
 * Gold lion watermark: 4×4 anchor grid, layers A/B/C, primary motion/opacity from capital risk,
 * ultra-subtle score-driven rotation, glow, scale, and opacity micro-shift.
 */
export function LionWatermarkBackdrop() {
  const pathname = usePathname();
  const { capitalRiskNorm, lionScore } = useLionWatermarkDynamics();

  const riskNorm = capitalRiskNorm;
  const score01 = lionScore / 100;

  const activeMarks = useMemo(() => {
    const densityCount = Math.round(4 + riskNorm * 12);
    return buildActiveMarks(densityCount, riskNorm);
  }, [riskNorm]);

  const scoreRotBase = lerp(-3, 3, score01);
  const scoreScale = lerp(0.98, 1.02, score01);
  const blurReductionPx = lerp(0.55, 0, riskNorm);

  return (
    <div className={`${styles.root} print:hidden`} aria-hidden>
      {activeMarks.map((m) => {
        const v = scoreVarianceDeg(m.cellIndex);
        const scoreDelta = Math.min(3, Math.max(-3, scoreRotBase + v));
        const totalRot = m.baseRot + scoreDelta;
        const flip = m.flip ? -1 : 1;

        const opacityRisk = lerp(OPACITY_RISK_MIN, OPACITY_RISK_MAX, riskNorm);
        const opacityScoreFactor = lerp(0.95, 1.05, score01);
        const opacity = Math.min(GLOBAL_OPACITY_CAP, opacityRisk * opacityScoreFactor);

        const { blurPx, alpha } = glowForLayer(score01, m.layer);
        const filterParts: string[] = [];
        if (blurPx > 0.05 && alpha > 0.002) {
          filterParts.push(
            `drop-shadow(0 0 ${blurPx.toFixed(2)}px rgba(255,204,106,${alpha.toFixed(4)}))`,
          );
        }
        if (blurReductionPx > 0.02) {
          filterParts.push(`blur(${blurReductionPx.toFixed(3)}px)`);
        }
        const combinedFilter = filterParts.length > 0 ? filterParts.join(" ") : undefined;

        const imgStyle: CSSProperties = {
          width: "100%",
          height: "auto",
          opacity,
          transform: `rotate(${totalRot}deg) scaleX(${flip}) scale(${scoreScale})`,
          transformOrigin: "center center",
          ...(combinedFilter ? { filter: combinedFilter } : {}),
          transition: SCORE_TRANSITION,
        };

        const driftX = lerp(0.15, 0.65, riskNorm);
        const driftY = lerp(0.12, 0.55, riskNorm);
        const phase = (m.cellIndex % 4) * 0.21;
        const durSec = lerp(14, 7.5, riskNorm);

        const wrapStyle = {
          "--wm-drift-x": `${driftX}vw`,
          "--wm-drift-y": `${driftY}vh`,
          "--wm-float-delay": `${phase}s`,
          "--wm-float-dur": `${durSec}s`,
        } as CSSProperties;

        return (
          <div
            key={`${pathname}-${m.cellIndex}`}
            className={styles.markWrap}
            style={{
              left: pct(m.leftPct),
              top: pct(m.topPct),
              width: m.widthPx,
              zIndex: zForLayer(m.layer),
            }}
          >
            <div className={styles.markFloat} style={wrapStyle}>
              <img
                src={BRAND_LIONHEAD_GOLD}
                alt=""
                width={m.widthPx}
                height={m.widthPx}
                decoding="async"
                className={styles.mark}
                style={imgStyle}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
