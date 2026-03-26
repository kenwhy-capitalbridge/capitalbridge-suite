import { describe, expect, it } from 'vitest';
import {
  isLionVerdictJson,
  normalizeLionVerdictForJson,
  runLionVerdictEngineStressJson,
  stringifyLionVerdictJsonCanonical,
  stripCurrencyMarkersFromText,
} from '../src/lionsVerdict/lionVerdictJson';

const minimalStressInputs = {
  capitalResilienceScore: 10,
  tier: 'Moderate' as const,
  fragilityIndicator: 'Watchful' as const,
  initialCapital: 1_000_000,
  withdrawalAmount: 50_000,
  timeHorizonYears: 25,
  simulatedAverageOutcome: 950_000,
  maximumDrawdownPct: 35,
  worstCaseOutcome: 400_000,
};

describe('lionVerdictJson', () => {
  it('runLionVerdictEngineStressJson validates and has no currency markers', () => {
    const j = runLionVerdictEngineStressJson(minimalStressInputs);
    expect(isLionVerdictJson(j)).toBe(true);
    const blob = JSON.stringify(j);
    expect(blob).not.toMatch(/(^|\s)RM(\s|\d)/);
    expect(blob.includes('MYR')).toBe(false);
    expect(blob.includes('$')).toBe(false);
    expect(typeof j.score0to100).toBe('number');
  });

  it('normalizeLionVerdictForJson strips RM from strings', () => {
    const base = runLionVerdictEngineStressJson({
      ...minimalStressInputs,
      initialCapital: 100,
      withdrawalAmount: 5,
      simulatedAverageOutcome: 90,
      worstCaseOutcome: 40,
    });
    const n = normalizeLionVerdictForJson({
      ...base,
      interpretation: 'RM 100 and MYR 50 $20',
    });
    expect(n.interpretation).not.toMatch(/RM|MYR|\$/);
  });

  it('stringifyLionVerdictJsonCanonical is stable', () => {
    const j = runLionVerdictEngineStressJson(minimalStressInputs);
    const a = stringifyLionVerdictJsonCanonical(j);
    const b = stringifyLionVerdictJsonCanonical(j);
    expect(a).toBe(b);
    expect(a.indexOf('score0to100')).toBeLessThan(a.indexOf('fullNarrative'));
  });

  it('stripCurrencyMarkersFromText', () => {
    expect(stripCurrencyMarkersFromText('RM 1,234.50')).toBe('1234.50');
  });

  it('rejects extra properties', () => {
    const j = runLionVerdictEngineStressJson(minimalStressInputs) as Record<string, unknown>;
    expect(isLionVerdictJson({ ...j, extra: 1 })).toBe(false);
  });
});
