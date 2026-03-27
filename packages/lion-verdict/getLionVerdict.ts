import { LION_COPY, type Tier, type Line } from './copy';

export type HistoryEntry = {
  index: number;
  timestamp: number;
};

export type CrossReportHistoryEntry = {
  index: number;
  reportType: string;
};

export type GlobalHistory = {
  headline: CrossReportHistoryEntry[];
  guidance: CrossReportHistoryEntry[];
};

export type Persona = 'conservative' | 'balanced' | 'aggressive';

export type GetLionVerdictInput = {
  userId: string;
  reportType: string;
  tier: Tier;
  persona: Persona;
  previousHeadlineIndex?: number;
  previousGuidanceIndex?: number;
  confidenceScore?: number;
  headlineHistory?: HistoryEntry[];
  guidanceHistory?: HistoryEntry[];
  globalHistory?: GlobalHistory;
};

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type GetLionVerdictOutput = {
  headline: string;
  guidance: string;
  headlineIndex: number;
  guidanceIndex: number;
  confidenceBand: ConfidenceBand;
  emphasis?: string;
  persona: Persona;
  history: {
    headline: HistoryEntry[];
    guidance: HistoryEntry[];
  };
};

export function hashString(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickWeightedIndex(lines: Line[], hash: number): number {
  if (!lines.length) return 0;
  const totalWeight = lines.reduce((sum, line) => sum + line.weight, 0);
  if (totalWeight === 0) return 0;
  const target = hash % totalWeight;
  let running = 0;
  for (let i = 0; i < lines.length; i += 1) {
    running += lines[i].weight;
    if (target < running) return i;
  }
  return lines.length - 1;
}

function boostWeights(lines: Line[], persona: Persona): Line[] {
  if (persona === 'balanced') return lines;
  const keywords = persona === 'conservative' ? ['preserve', 'protect'] : ['optimise', 'expand'];
  return lines.map((line) => {
    const text = line.text.toLowerCase();
    const matches = keywords.some((keyword) => text.includes(keyword));
    return matches ? { ...line, weight: line.weight + 2 } : line;
  });
}

export function getLionVerdict(input: GetLionVerdictInput): GetLionVerdictOutput {
  const { userId, reportType, tier } = input;
  const headlines = LION_COPY[tier].headlines;
  const guidance = LION_COPY[tier].guidance;
  const seed = `${userId}:${reportType}:${tier}`;
  const h = hashString(seed);
  const personaHeadlines = boostWeights(headlines, input.persona);
  const personaGuidance = boostWeights(guidance, input.persona);
  const computedHeadlineIndex = pickWeightedIndex(personaHeadlines, h);
  const computedGuidanceIndex = pickWeightedIndex(personaGuidance, h >> 3);
  const resolvedHeadlineIndex =
    typeof input.previousHeadlineIndex === 'number' && headlines.length > 0
      ? (input.previousHeadlineIndex + 1) % headlines.length
      : computedHeadlineIndex;
  const resolvedGuidanceIndex =
    typeof input.previousGuidanceIndex === 'number' && guidance.length > 0
      ? (input.previousGuidanceIndex + 1) % guidance.length
      : computedGuidanceIndex;
  const headlineIndex = avoidRecent(
    resolvedHeadlineIndex,
    input.headlineHistory,
    headlines.length,
    input.globalHistory?.headline,
    reportType,
  );
  const guidanceIndex = avoidRecent(
    resolvedGuidanceIndex,
    input.guidanceHistory,
    guidance.length,
    input.globalHistory?.guidance,
    reportType,
  );
  const confidenceScore = Number.isFinite(input.confidenceScore) ? input.confidenceScore : 0.5;
  const confidenceBand = determineConfidenceBand(confidenceScore);
  const prefixList = CONFIDENCE_PREFIXES[confidenceBand];
  const prefixSeed = hashString(`${seed}:confidence`);
  const prefix = prefixList[prefixSeed % prefixList.length];
  const baseHeadline = personaHeadlines[headlineIndex]?.text ?? '';
  const finalHeadline = prefix ? `${prefix} ${baseHeadline}` : baseHeadline;
  let guidanceText = personaGuidance[guidanceIndex]?.text ?? '';
  if (confidenceBand === 'low' && guidanceText) {
    guidanceText = `Conditions are less certain. ${guidanceText}`;
  }
  const emphasis = selectEmphasis(tier, h >> 7);
  const now = Date.now();
  const headlineHistory = appendHistory(input.headlineHistory, { index: headlineIndex, timestamp: now });
  const guidanceHistory = appendHistory(input.guidanceHistory, { index: guidanceIndex, timestamp: now });

  return {
    headline: finalHeadline,
    guidance: guidanceText,
    headlineIndex,
    guidanceIndex,
    confidenceBand,
    emphasis,
    persona: input.persona,
    history: {
      headline: headlineHistory,
      guidance: guidanceHistory,
    },
  };
}

const CONFIDENCE_PREFIXES: Record<ConfidenceBand, readonly string[]> = {
  high: ['Clearly,', 'Strongly,', 'Evidently,'],
  medium: ['Steadily,', 'In balance,', 'On course,'],
  low: ['Cautiously,', 'Tentatively,', 'With care,'],
};

function determineConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

type EmphasisTier = 'AT_RISK' | 'NOT_SUSTAINABLE';

const EMPHASIS_LINES: Record<EmphasisTier, readonly string[]> = {
  AT_RISK: [
    'Action now keeps critical gaps from widening any further.',
    'Lock in one defensive adjustment before pressure overruns the structure.',
    'Prioritise a concrete leverage or withdrawal reset this review cycle.',
  ],
  NOT_SUSTAINABLE: [
    'Immediate preservation is the only path to avoid total depletion.',
    'Reset expectations: income must pause until capital is stabilised.',
    'Shift focus entirely to survival before considering growth levers again.',
  ],
};

function selectEmphasis(tier: Tier, hash: number): string | undefined {
  if (tier !== 'AT_RISK' && tier !== 'NOT_SUSTAINABLE') return undefined;
  const lines = EMPHASIS_LINES[tier];
  if (!lines.length) return undefined;
  const lineModels = lines.map((text) => ({ text, weight: 1 } as Line));
  const idx = pickWeightedIndex(lineModels, hash);
  return lines[idx];
}

const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function avoidRecent(
  index: number,
  history: HistoryEntry[] | undefined,
  length: number,
  globalEntries: CrossReportHistoryEntry[] | undefined,
  currentReportType: string,
): number {
  const normalizedLength = Math.max(1, length);
  if (normalizedLength <= 0) return 0;
  const hasHistory = !!(history && history.length);
  const hasGlobal =
    !!(globalEntries && globalEntries.length && globalEntries.some((entry) => entry.reportType !== currentReportType));
  if (!hasHistory && !hasGlobal) {
    return index % normalizedLength;
  }
  let next = index % normalizedLength;
  const cutoff = Date.now() - HISTORY_TTL_MS;
  const recent = new Set<number>();
  if (hasHistory) {
    history
      ?.filter((entry) => entry.timestamp >= cutoff)
      .forEach((entry) => recent.add(entry.index % normalizedLength));
  }
  if (hasGlobal) {
    globalEntries
      ?.slice(-3)
      .filter((entry) => entry.reportType !== currentReportType)
      .forEach((entry) => recent.add(entry.index % normalizedLength));
  }
  for (let i = 0; i < normalizedLength; i += 1) {
    if (!recent.has(next)) return next;
    next = (next + 1) % normalizedLength;
  }
  return index % normalizedLength;
}

function appendHistory(history: HistoryEntry[] | undefined, entry: HistoryEntry): HistoryEntry[] {
  const cutoff = Date.now() - HISTORY_TTL_MS;
  const pruned = (history ?? []).filter((item) => item.timestamp >= cutoff);
  return [...pruned, entry].slice(-3);
}

export function mapPersona({
  riskTolerance,
  surplusRatio,
}: {
  riskTolerance: number;
  surplusRatio: number;
}): Persona {
  if (surplusRatio < 0.9) return 'conservative';
  if (surplusRatio > 1.2) return 'aggressive';
  return 'balanced';
}
