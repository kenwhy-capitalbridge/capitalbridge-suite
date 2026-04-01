import { LION_COPY as BASE_LION_COPY, type Tier } from "../copy";

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

export function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique(arr: string[], usedSet: Set<string>) {
  const available = arr.filter((item) => !usedSet.has(item));
  const choice = available.length > 0 ? pickRandom(available) : pickRandom(arr);
  usedSet.add(choice);
  return choice;
}

const usedHeadlines = new Set<string>();
const usedGuidance = new Set<string>();

export function getLionTone(score: number): Tier {
  if (score >= 85) return "STRONG";
  if (score >= 70) return "STABLE";
  if (score >= 50) return "FRAGILE";
  if (score >= 30) return "AT_RISK";
  return "NOT_SUSTAINABLE";
}

export function generateLionToneCopy(score: number) {
  const tier = getLionTone(score);
  const pool = LION_COPY[tier];

  return {
    headline: pickUnique(pool.headlines, usedHeadlines),
    guidance: pickUnique(pool.guidance, usedGuidance),
    tier,
  };
}
