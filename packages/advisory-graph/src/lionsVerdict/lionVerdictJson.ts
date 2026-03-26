/**
 * Lion's Verdict — canonical JSON (API / dashboard persistence / PDF data).
 * Schema: lionVerdict.schema.json — exact property set, no extras.
 */

import type {
  LionFragilityLevel,
  LionHealthVariables,
  LionScoreTier,
  LionStressAdvisoryInputs,
  LionVerdictOutput,
  ForeverLionInputs,
} from './types';
import {
  runLionVerdictEngineCapitalHealth,
  runLionVerdictEngineForever,
  runLionVerdictEngineStress,
} from './engine';

import lionVerdictSchema from './lionVerdict.schema.json';

export const LION_VERDICT_JSON_SCHEMA_VERSION = 1 as const;

/** Exact JSON payload shape (same keys as engine output). */
export type LionVerdictJson = LionVerdictOutput;

export const LION_VERDICT_JSON_KEYS = [
  'score0to100',
  'status',
  'fragility',
  'opening',
  'interpretation',
  'outcomeSummary',
  'riskExplanation',
  'advisoryRecommendation',
  'strategicOptions',
  'capitalUnlockGuidance',
  'scenarioActions',
  'priorityActions',
  'ifYouDoNothing',
  'fullNarrative',
] as const;

export type LionVerdictJsonKey = (typeof LION_VERDICT_JSON_KEYS)[number];

/** Draft 2020-12 schema for validators and OpenAPI. */
export const LION_VERDICT_JSON_SCHEMA = lionVerdictSchema as Record<string, unknown>;

const STATUS_SET = new Set<LionScoreTier>([
  'Critical',
  'Weak',
  'Moderate',
  'Strong',
  'Very Strong',
]);

const FRAGILITY_SET = new Set<LionFragilityLevel>([
  'Stable',
  'Watchful',
  'Vulnerable',
  'Fragile',
  'Critical',
]);

/** Plain amount for narrative strings in JSON (no currency symbol, no thousands separators). */
export function formatLionAmountForJson(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2);
}

/** Remove common currency markers from free text (normalise UI-formatted copy for schema compliance). */
export function stripCurrencyMarkersFromText(text: string): string {
  let s = text.replace(/\b(?:RM|MYR|USD)\s*/gi, '');
  s = s.replace(/\$\s*/g, '');
  s = s.replace(/,/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

function isStringArray(a: unknown, maxLen: number, itemMax: number): boolean {
  if (!Array.isArray(a) || a.length > maxLen) return false;
  return a.every((x) => typeof x === 'string' && x.length <= itemMax);
}

/**
 * Runtime check: exact keys, types, enums; `score0to100` must be a finite number.
 * Does not enforce maxLength (optional post-parse trim).
 */
export function isLionVerdictJson(value: unknown): value is LionVerdictJson {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length !== LION_VERDICT_JSON_KEYS.length) return false;
  for (const k of LION_VERDICT_JSON_KEYS) {
    if (!(k in o)) return false;
  }
  for (const k of keys) {
    if (!LION_VERDICT_JSON_KEYS.includes(k as LionVerdictJsonKey)) return false;
  }

  if (typeof o.score0to100 !== 'number' || !Number.isFinite(o.score0to100)) return false;
  if (o.score0to100 < 0 || o.score0to100 > 100) return false;

  if (typeof o.status !== 'string' || !STATUS_SET.has(o.status as LionScoreTier)) return false;
  if (typeof o.fragility !== 'string' || !FRAGILITY_SET.has(o.fragility as LionFragilityLevel)) return false;

  const strKeys: LionVerdictJsonKey[] = [
    'opening',
    'interpretation',
    'outcomeSummary',
    'riskExplanation',
    'advisoryRecommendation',
    'ifYouDoNothing',
    'fullNarrative',
  ];
  for (const k of strKeys) {
    if (typeof o[k] !== 'string') return false;
  }

  if (!isStringArray(o.strategicOptions, 12, 500)) return false;
  if (!isStringArray(o.capitalUnlockGuidance, 12, 500)) return false;
  if (!isStringArray(o.scenarioActions, 12, 500)) return false;
  if (!isStringArray(o.priorityActions, 12, 500)) return false;

  return true;
}

export function assertLionVerdictJson(value: unknown): LionVerdictJson {
  if (!isLionVerdictJson(value)) {
    throw new Error('Invalid LionVerdictJson: shape or types do not match schema');
  }
  return value;
}

/** Copy with only schema keys, normalised strings (no RM/MYR/$ in text). */
export function normalizeLionVerdictForJson(output: LionVerdictOutput): LionVerdictJson {
  const strip = stripCurrencyMarkersFromText;
  return {
    score0to100: Math.round(Math.min(100, Math.max(0, output.score0to100))),
    status: output.status,
    fragility: output.fragility,
    opening: strip(output.opening),
    interpretation: strip(output.interpretation),
    outcomeSummary: strip(output.outcomeSummary),
    riskExplanation: strip(output.riskExplanation),
    advisoryRecommendation: strip(output.advisoryRecommendation),
    strategicOptions: output.strategicOptions.map(strip),
    capitalUnlockGuidance: output.capitalUnlockGuidance.map(strip),
    scenarioActions: output.scenarioActions.map(strip),
    priorityActions: output.priorityActions.map(strip),
    ifYouDoNothing: strip(output.ifYouDoNothing),
    fullNarrative: strip(output.fullNarrative),
  };
}

/** Fixed key order, deterministic serialization. */
export function stringifyLionVerdictJsonCanonical(value: LionVerdictJson): string {
  const ordered: Record<string, unknown> = {};
  for (const k of LION_VERDICT_JSON_KEYS) {
    ordered[k] = value[k];
  }
  return `${JSON.stringify(ordered)}\n`;
}

/** Stress model: amounts in prose use plain digits only (no currency symbol). */
export function runLionVerdictEngineStressJson(inputs: LionStressAdvisoryInputs): LionVerdictJson {
  return runLionVerdictEngineStress(inputs, formatLionAmountForJson);
}

/** Forever Income: same. */
export function runLionVerdictEngineForeverJson(input: ForeverLionInputs): LionVerdictJson {
  return runLionVerdictEngineForever(input, formatLionAmountForJson);
}

/**
 * Capital Health JSON path: supply numeric fields; engine strings stay symbol-free and deterministic.
 */
export type LionHealthVerdictJsonVars = {
  horizonYears: number;
  /** Expected return, e.g. 5 for 5% (stored as plain number in copy, no % if undesired — engine adds context in words). */
  expectedReturnPct: number;
  withdrawalAnnual?: number;
  desiredCapital?: number;
  runwayMonths?: number | null;
};

export function runLionVerdictEngineCapitalHealthJson(
  mode: 'withdrawal' | 'growth',
  tier: 1 | 2 | 3 | 4 | 5,
  v: LionHealthVerdictJsonVars,
): LionVerdictJson {
  const vars: LionHealthVariables = {
    horizon: String(Math.max(0, Math.round(v.horizonYears))),
    expectedReturn: formatLionAmountForJson(v.expectedReturnPct),
    estimatedReturn: formatLionAmountForJson(v.expectedReturnPct),
    withdrawal: v.withdrawalAnnual != null ? formatLionAmountForJson(v.withdrawalAnnual) : undefined,
    desiredCapital: v.desiredCapital != null ? formatLionAmountForJson(v.desiredCapital) : undefined,
    runway:
      v.runwayMonths != null && v.runwayMonths > 0 ? `${Math.round(v.runwayMonths)} months` : undefined,
  };
  return runLionVerdictEngineCapitalHealth(mode, tier, vars);
}
