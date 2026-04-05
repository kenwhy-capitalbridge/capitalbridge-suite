"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BRAND_LIONHEAD_GOLD } from "./brandPaths";
import styles from "./LionWatermarkBackdrop.module.css";

const GRID = 4;
const LEFT_LO = 3;
const LEFT_HI = 97;
const TOP_LO = 7;
const TOP_HI = 83;
const OFFSET_MAX = 4;
const MIN_DIST_PCT = 20;
const MIN_DIST_RELAXED = 14;

type SizeTier = "L" | "M" | "S";

type LionMarkSpec = {
  leftPct: number;
  topPct: number;
  widthPx: number;
  opacity: number;
  blurPx: number;
  flip: number;
  floatDurSec: number;
  floatDelaySec: number;
};

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cellBase(idx: number): { left: number; top: number } {
  const col = idx % GRID;
  const row = Math.floor(idx / GRID);
  return {
    left: LEFT_LO + ((col + 0.5) / GRID) * (LEFT_HI - LEFT_LO),
    top: TOP_LO + ((row + 0.5) / GRID) * (TOP_HI - TOP_LO),
  };
}

function distPct(
  a: { left: number; top: number },
  b: { left: number; top: number },
): number {
  return Math.hypot(a.left - b.left, a.top - b.top);
}

/** Exactly one L, rest M/S per count (5–7). */
function assignTiers(n: number, largeSlot: number): SizeTier[] {
  const tiers: SizeTier[] = new Array(n).fill("S") as SizeTier[];
  tiers[largeSlot] = "L";
  const rem = n - 1;
  const nMed = rem >= 5 ? 3 : 2;
  const slots = shuffle(
    [...Array(n)].map((_, i) => i).filter((i) => i !== largeSlot),
  );
  for (let k = 0; k < nMed; k++) tiers[slots[k]!] = "M";
  return tiers;
}

function edgeAffinity(left: number, top: number): number {
  return Math.min(left - LEFT_LO, LEFT_HI - left, top - TOP_LO, TOP_HI - top);
}

function nudgeLargeOffEdge(left: number, top: number): { left: number; top: number } {
  const candidates: ("left" | "right" | "top" | "bottom")[] = [];
  if (left < 40) candidates.push("left");
  if (left > 60) candidates.push("right");
  if (top < 38) candidates.push("top");
  if (top > 62) candidates.push("bottom");
  const pick =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]!
      : Math.random() < 0.5
        ? "left"
        : "right";
  const off = randomBetween(0.3, 0.5);
  if (pick === "left") return { left: LEFT_LO - off * 10, top };
  if (pick === "right") return { left: LEFT_HI + off * 10, top };
  if (pick === "top") return { left, top: TOP_LO - off * 8 };
  return { left, top: TOP_HI + off * 8 };
}

function widthForTier(t: SizeTier): number {
  if (t === "L") return Math.round(randomBetween(280, 340));
  if (t === "M") return Math.round(randomBetween(160, 220));
  return Math.round(randomBetween(100, 140));
}

function opacityForTier(t: SizeTier): number {
  let o: number;
  if (t === "L") o = randomBetween(0.04, 0.055);
  else if (t === "M") o = randomBetween(0.028, 0.045);
  else o = randomBetween(0.02, 0.03);
  return Math.min(0.06, o);
}

function blurForTier(t: SizeTier): number {
  if (t === "L") return Math.random() < 0.78 ? randomBetween(2, 3.8) : 0;
  if (t === "M") return Math.random() < 0.32 ? randomBetween(2, 2.8) : 0;
  return Math.random() < 0.12 ? randomBetween(1.5, 2.2) : 0;
}

function tryPickPositions(count: number, minD: number): { idx: number; left: number; top: number }[] {
  const order = shuffle([...Array(16)].map((_, i) => i));
  const picked: { idx: number; left: number; top: number }[] = [];
  for (const idx of order) {
    if (picked.length >= count) break;
    const base = cellBase(idx);
    const left = Math.min(LEFT_HI, Math.max(LEFT_LO, base.left + randomBetween(-OFFSET_MAX, OFFSET_MAX)));
    const top = Math.min(TOP_HI, Math.max(TOP_LO, base.top + randomBetween(-OFFSET_MAX, OFFSET_MAX)));
    const candidate = { idx, left, top };
    if (picked.every((p) => distPct(p, candidate) >= minD)) picked.push(candidate);
  }
  return picked;
}

function pickSpreadPositions(count: number): { idx: number; left: number; top: number }[] {
  for (const minD of [MIN_DIST_PCT, MIN_DIST_RELAXED]) {
    for (let t = 0; t < 55; t++) {
      const picked = tryPickPositions(count, minD);
      if (picked.length >= count) return picked.slice(0, count);
    }
  }
  return [];
}

function generateLionMarks(): LionMarkSpec[] {
  const count = 5 + Math.floor(Math.random() * 3);
  let picked = pickSpreadPositions(count);

  if (picked.length < 5) {
    const fallbackIdx = [5, 10, 0, 15, 3, 9, 12];
    picked = fallbackIdx.slice(0, count).map((idx) => {
      const b = cellBase(idx);
      return { idx, left: b.left, top: b.top };
    });
  }
  if (picked.length > count) picked = picked.slice(0, count);

  let largeSlot = 0;
  let best = Infinity;
  for (let i = 0; i < picked.length; i++) {
    const e = edgeAffinity(picked[i]!.left, picked[i]!.top);
    if (e < best) {
      best = e;
      largeSlot = i;
    }
  }

  const tiers = assignTiers(picked.length, largeSlot);

  return picked.map((p, i) => {
    const tier = tiers[i]!;
    let { left, top } = p;
    if (tier === "L") {
      const nudged = nudgeLargeOffEdge(p.left, p.top);
      left = nudged.left;
      top = nudged.top;
    }

    const widthPx = widthForTier(tier);
    const opacity = opacityForTier(tier);
    const blurPx = blurForTier(tier);
    const flip = left >= 50 ? -1 : 1;

    return {
      leftPct: left,
      topPct: top,
      widthPx,
      opacity,
      blurPx,
      flip,
      floatDurSec: randomBetween(50, 80),
      floatDelaySec: randomBetween(0, 14),
    };
  });
}

/**
 * Static luxury-style gold lion texture (LV-like monogram): fixed count, soft grid + jitter,
 * size hierarchy, ultra-low opacity, optional slow vertical drift. Regenerates on route change only.
 */
export function LionWatermarkBackdrop() {
  const pathname = usePathname();
  const [marks, setMarks] = useState<LionMarkSpec[]>([]);

  useEffect(() => {
    setMarks(generateLionMarks());
  }, [pathname]);

  return (
    <div className={`${styles.root} print:hidden`} data-cb-lion-watermark aria-hidden>
      {marks.map((m, i) => {
        const filterParts: string[] = [];
        if (m.blurPx > 0.05) filterParts.push(`blur(${m.blurPx.toFixed(2)}px)`);
        const imgFilter = filterParts.length > 0 ? filterParts.join(" ") : undefined;

        const imgStyle: CSSProperties = {
          width: "100%",
          height: "auto",
          opacity: m.opacity,
          transform: `scaleX(${m.flip})`,
          transformOrigin: "center center",
          ...(imgFilter ? { filter: imgFilter } : {}),
        };

        const wrapStyle = {
          "--wm-float-dur": `${m.floatDurSec}s`,
          "--wm-float-delay": `${m.floatDelaySec}s`,
        } as CSSProperties;

        return (
          <div
            key={`${pathname}-lion-${i}`}
            className={styles.markWrap}
            style={{
              left: pct(m.leftPct),
              top: pct(m.topPct),
              width: m.widthPx,
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
