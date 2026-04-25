import { LION_COPY as BASE_LION_COPY, type Tier } from "../copy";
import { deterministicPick } from "./utils/deterministic";

export const LION_COPY: Record<Tier, { headlines: string[]; guidance: string[] }> = {
  STRONG: {
    headlines: BASE_LION_COPY.STRONG.headlines.map((line) => line.text),
    guidance: BASE_LION_COPY.STRONG.guidance.map((line) => line.text),
  },
  STABLE: {
    headlines: BASE_LION_COPY.STABLE.headlines.map((line) => line.text),
    guidance: BASE_LION_COPY.STABLE.guidance.map((line) => line.text),
  },
  FRAGILE: {
    headlines: BASE_LION_COPY.FRAGILE.headlines.map((line) => line.text),
    guidance: BASE_LION_COPY.FRAGILE.guidance.map((line) => line.text),
  },
  AT_RISK: {
    headlines: BASE_LION_COPY.AT_RISK.headlines.map((line) => line.text),
    guidance: BASE_LION_COPY.AT_RISK.guidance.map((line) => line.text),
  },
  NOT_SUSTAINABLE: {
    headlines: BASE_LION_COPY.NOT_SUSTAINABLE.headlines.map((line) => line.text),
    guidance: BASE_LION_COPY.NOT_SUSTAINABLE.guidance.map((line) => line.text),
  },
};

export function pickRandom(arr: string[], seed = "lion-copy") {
  return deterministicPick(arr, seed);
}

export function getLionTone(score: number): Tier {
  if (score >= 85) return "STRONG";
  if (score >= 70) return "STABLE";
  if (score >= 50) return "FRAGILE";
  if (score >= 30) return "AT_RISK";
  return "NOT_SUSTAINABLE";
}

export function generateLionToneCopy(score: number, seed = `score:${score}`) {
  const tier = getLionTone(score);
  const pool = LION_COPY[tier];

  return {
    headline: deterministicPick(pool.headlines, `${seed}:${tier}:headline`),
    guidance: deterministicPick(pool.guidance, `${seed}:${tier}:guidance`),
    tier,
  };
}
