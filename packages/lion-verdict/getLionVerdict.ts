import { LION_COPY, type Tier, type Line } from './copy';
import { buildLionContext, type LionContextInput } from './src/buildLionContext';

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

export type LionVerdictMemory = {
  usedHeadlines: string[];
  usedGuidance: string[];
};

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
  memory?: LionVerdictMemory;
} & LionContextInput;

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type GetLionVerdictOutput = {
  headline: string;
  guidance: string;
  guidanceBullets: string[];
  headlineIndex: number;
  guidanceIndex: number;
  confidenceBand: ConfidenceBand;
  emphasis?: string;
  persona: Persona;
  memory: LionVerdictMemory;
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
  const lionContext = buildLionContext(input);
  void lionContext;

  const { userId, reportType, tier } = input;
  const headlines = LION_COPY[tier].headlines;
  const guidance = LION_COPY[tier].guidance;
  const seed = `${userId}:${reportType}:${tier}`;
  const h = hashString(seed);
  const personaHeadlines = boostWeights(headlines, input.persona);
  const personaGuidance = boostWeights(guidance, input.persona);
  const memory = input.memory ?? { usedHeadlines: [], usedGuidance: [] };
  const headlineIndex = selectBestIndex({
    lines: personaHeadlines,
    tier,
    seed: `${seed}:headline:${h}`,
    usedTextHistory: memory.usedHeadlines,
    localHistory: input.headlineHistory,
    globalHistory: input.globalHistory?.headline,
    reportType,
    preferredIndex:
      typeof input.previousHeadlineIndex === 'number' && headlines.length > 0
        ? (input.previousHeadlineIndex + 1) % headlines.length
        : pickWeightedIndex(personaHeadlines, h),
    excluded: new Set<number>(),
  });
  const guidanceCount = tier === 'AT_RISK' || tier === 'NOT_SUSTAINABLE' ? 4 : 3;
  const selectedGuidanceIndices: number[] = [];
  let syntheticUsedGuidance = [...memory.usedGuidance];
  for (let i = 0; i < guidanceCount; i += 1) {
    const guidanceIndex = selectBestIndex({
      lines: personaGuidance,
      tier,
      seed: `${seed}:guidance:${h >> 3}:${i}`,
      usedTextHistory: syntheticUsedGuidance,
      localHistory: input.guidanceHistory,
      globalHistory: input.globalHistory?.guidance,
      reportType,
      preferredIndex:
        typeof input.previousGuidanceIndex === 'number' && guidance.length > 0
          ? (input.previousGuidanceIndex + 1 + i) % guidance.length
          : pickWeightedIndex(personaGuidance, (h >> 3) + i),
      excluded: new Set(selectedGuidanceIndices),
    });
    selectedGuidanceIndices.push(guidanceIndex);
    const selectedText = normalizeLineText(personaGuidance[guidanceIndex]?.text ?? '');
    if (selectedText) syntheticUsedGuidance.push(selectedText);
  }
  const guidanceIndex = selectedGuidanceIndices[0] ?? 0;
  const confidenceScore =
    typeof input.confidenceScore === 'number' && Number.isFinite(input.confidenceScore)
      ? input.confidenceScore
      : 0.5;
  const confidenceBand = determineConfidenceBand(confidenceScore);
  const finalHeadline = normalizeLineText(personaHeadlines[headlineIndex]?.text ?? '');
  const guidanceBullets = selectedGuidanceIndices
    .map((idx) => normalizeLineText(personaGuidance[idx]?.text ?? ''))
    .filter(Boolean);
  const guidanceText = guidanceBullets.map((line) => `• ${line}`).join('\n');
  const now = Date.now();
  const headlineHistory = appendHistory(input.headlineHistory, { index: headlineIndex, timestamp: now });
  const guidanceHistory = appendHistory(input.guidanceHistory, { index: guidanceIndex, timestamp: now });
  const updatedMemory: LionVerdictMemory = {
    usedHeadlines: appendTextHistory(memory.usedHeadlines, finalHeadline),
    usedGuidance: appendTextHistory(memory.usedGuidance, ...guidanceBullets),
  };

  return {
    headline: finalHeadline,
    guidance: guidanceText,
    guidanceBullets,
    headlineIndex,
    guidanceIndex,
    confidenceBand,
    emphasis: undefined,
    persona: input.persona,
    memory: updatedMemory,
    history: {
      headline: headlineHistory,
      guidance: guidanceHistory,
    },
  };
}

function determineConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
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
  return [...pruned, entry].slice(-20);
}

function normalizeLineText(raw: string): string {
  return raw.replace(/^•\s*/u, '').replace(/\s+/g, ' ').trim();
}

function appendTextHistory(existing: string[], ...items: string[]): string[] {
  const out = [...existing];
  for (const item of items) {
    const clean = normalizeLineText(item);
    if (clean) out.push(clean);
  }
  return out.slice(-20);
}

function selectBestIndex(args: {
  lines: Line[];
  tier: Tier;
  seed: string;
  usedTextHistory: string[];
  localHistory?: HistoryEntry[];
  globalHistory?: CrossReportHistoryEntry[];
  reportType: string;
  preferredIndex: number;
  excluded: Set<number>;
}): number {
  const {
    lines,
    tier,
    seed,
    usedTextHistory,
    localHistory,
    globalHistory,
    reportType,
    preferredIndex,
    excluded,
  } = args;
  if (!lines.length) return 0;
  const recentUsed = new Set(usedTextHistory.slice(-10));
  const localRecent = new Set((localHistory ?? []).slice(-10).map((x) => x.index % lines.length));
  const globalRecent = new Set(
    (globalHistory ?? [])
      .slice(-10)
      .filter((x) => x.reportType !== reportType)
      .map((x) => x.index % lines.length),
  );
  let best = preferredIndex % lines.length;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < lines.length; i += 1) {
    if (excluded.has(i)) continue;
    const text = normalizeLineText(lines[i].text);
    if (!lineSatisfiesTierTone(text, tier)) continue;
    const usedCount = usedTextHistory.filter((x) => x === text).length;
    const neverUsed = usedCount === 0;
    const inRecent = recentUsed.has(text);
    const score =
      lines[i].weight * 10 +
      (neverUsed ? 120 : 0) +
      (inRecent ? -90 : 0) +
      usedCount * -14 +
      (localRecent.has(i) ? -55 : 0) +
      (globalRecent.has(i) ? -35 : 0) +
      (i === preferredIndex ? 4 : 0) +
      ((hashString(`${seed}:${i}`) % 100) / 100);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (excluded.has(best)) {
    for (let i = 0; i < lines.length; i += 1) {
      if (!excluded.has(i)) return i;
    }
  }
  return best;
}

function lineSatisfiesTierTone(text: string, tier: Tier): boolean {
  const lower = text.toLowerCase();
  if (tier === 'STRONG') {
    return !/\b(but|must|depends?|limited)\b/.test(lower);
  }
  if (tier === 'STABLE') {
    return /\b(but|must|depends?|limited)\b/.test(lower);
  }
  if (tier === 'FRAGILE') {
    return /\b(uncertain|conditional|sensitive|may|risk|fragile|not assured)\b/.test(lower);
  }
  if (tier === 'AT_RISK') {
    return /\b(weaken|declin|slip|erod|strain|falter|failing)\b/.test(lower);
  }
  if (tier === 'NOT_SUSTAINABLE') {
    return /\b(fail|collapse|gone|cannot hold|break|imminent|non-optional|not viable)\b/.test(lower);
  }
  return true;
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
