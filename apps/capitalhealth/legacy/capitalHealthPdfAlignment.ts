/**
 * Single source of truth for Capital Health PDF: verdict, colours, confidence,
 * executive summary tone, chart caption, and in-chart copy — all aligned.
 */

import type { CalculatorInputs, SimulationResult } from './calculator-types';

export type GrowthVerdict = 'ABOVE TARGET' | 'ON TRACK' | 'BELOW TARGET' | 'AT RISK';
export type WithdrawalVerdict = 'SUSTAINABLE' | 'STABLE' | 'UNDER PRESSURE' | 'AT RISK';
export type CapitalHealthVerdict = GrowthVerdict | WithdrawalVerdict;

export type StructuralTone = 'STRONG' | 'STABLE' | 'UNDER_PRESSURE' | 'AT_RISK';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChartPoint {
  month: number;
  nominal: number;
}

const MONTHS_PER_YEAR = 12;
const BAR_COUNT = 48;
/** Locked: small gap for STABLE (same currency units as inputs). */
const STABLE_GAP_MAX_ABS = 500;
const STABLE_GAP_MAX_PCT_OF_INCOME = 0.02;

const VERDICT_GREEN = '#1f5f4b';
const VERDICT_AMBER = '#b45309';
const VERDICT_RED = '#b91c1c';

const CONF_GREEN = '#55B685';
const CONF_AMBER = '#d4a574';
const CONF_RED = '#e57373';

function horizonMonths(inputs: CalculatorInputs): number {
  return Math.max(1, Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR));
}

function incomeGapMonthly(inputs: CalculatorInputs, result: SimulationResult): number {
  const sustainable =
    (result as SimulationResult & { sustainableIncomeMonthly?: number }).sustainableIncomeMonthly ??
    result.monthlyReturnOnCapital ??
    result.passiveIncomeMonthly ??
    0;
  if (inputs.mode !== 'withdrawal') return 0;
  return Math.max(0, inputs.targetMonthlyIncome - sustainable);
}

function depletedBeforeHorizon(inputs: CalculatorInputs, result: SimulationResult): boolean {
  const H = horizonMonths(inputs);
  return result.depletionMonth != null && result.depletionMonth <= H;
}

function trajectoryDeclines(chart: ChartPoint[]): boolean {
  if (chart.length < 2) return false;
  const first = chart[0]!.nominal;
  const last = chart[chart.length - 1]!.nominal;
  return last < first * 0.999;
}

function coverageGrowth(inputs: CalculatorInputs, result: SimulationResult): number {
  const t = inputs.targetFutureCapital || 1;
  return (result.nominalCapitalAtHorizon / t) * 100;
}

export function sampleCapitalHealthChartPoints(full: ChartPoint[], maxPoints = BAR_COUNT): ChartPoint[] {
  if (full.length === 0) return [];
  if (full.length <= maxPoints) return full;
  const first = full[0]!;
  const last = full[full.length - 1]!;
  const innerSlots = maxPoints - 2;
  const inner: ChartPoint[] = [];
  const lastInnerIdx = full.length - 2;
  for (let k = 1; k <= innerSlots; k++) {
    const idx = Math.round((k / (innerSlots + 1)) * lastInnerIdx);
    inner.push(full[Math.min(Math.max(1, idx), lastInnerIdx)]!);
  }
  const merged = [first, ...inner, last];
  const seen = new Set<string>();
  const out: ChartPoint[] = [];
  for (const p of merged) {
    const key = `${p.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  out.sort((a, b) => a.month - b.month);
  return out;
}

export function computeCapitalHealthVerdict(
  inputs: CalculatorInputs,
  result: SimulationResult,
  chartSeries: ChartPoint[],
): CapitalHealthVerdict {
  if (inputs.mode === 'growth') {
    const cov = coverageGrowth(inputs, result);
    if (trajectoryDeclines(chartSeries)) return 'AT RISK';
    if (cov >= 105) return 'ABOVE TARGET';
    if (cov >= 95) return 'ON TRACK';
    return 'BELOW TARGET';
  }

  const gap = incomeGapMonthly(inputs, result);
  const target = inputs.targetMonthlyIncome;
  const atRisk = depletedBeforeHorizon(inputs, result);
  if (atRisk) return 'AT RISK';
  if (gap <= Math.max(0.01, target * 0.0001)) return 'SUSTAINABLE';
  const smallGap =
    target > 0 &&
    gap <= STABLE_GAP_MAX_PCT_OF_INCOME * target &&
    gap <= STABLE_GAP_MAX_ABS;
  if (smallGap) return 'STABLE';
  return 'UNDER PRESSURE';
}

export function verdictColor(verdict: CapitalHealthVerdict): string {
  switch (verdict) {
    case 'ABOVE TARGET':
    case 'ON TRACK':
    case 'SUSTAINABLE':
      return VERDICT_GREEN;
    case 'BELOW TARGET':
    case 'STABLE':
    case 'UNDER PRESSURE':
      return VERDICT_AMBER;
    case 'AT RISK':
      return VERDICT_RED;
  }
}

export function structuralToneFromVerdict(verdict: CapitalHealthVerdict): StructuralTone {
  if (verdict === 'ABOVE TARGET' || verdict === 'SUSTAINABLE') return 'STRONG';
  if (verdict === 'ON TRACK' || verdict === 'STABLE') return 'STABLE';
  if (verdict === 'BELOW TARGET' || verdict === 'UNDER PRESSURE') return 'UNDER_PRESSURE';
  return 'AT_RISK';
}

export function confidenceFromVerdict(verdict: CapitalHealthVerdict): ConfidenceLevel {
  if (verdict === 'ABOVE TARGET' || verdict === 'SUSTAINABLE') return 'HIGH';
  if (verdict === 'AT RISK') return 'LOW';
  return 'MEDIUM';
}

export function confidenceBarColor(level: ConfidenceLevel): string {
  if (level === 'HIGH') return CONF_GREEN;
  if (level === 'MEDIUM') return CONF_AMBER;
  return CONF_RED;
}

export function modeHeaderSuffix(inputs: CalculatorInputs): string {
  return inputs.mode === 'growth' ? 'COMPOUNDING GROWTH' : 'MONTHLY WITHDRAWAL';
}

export function modeCoverLabel(inputs: CalculatorInputs): string {
  return inputs.mode === 'growth' ? 'Mode: Compounding Growth' : 'Mode: Monthly Withdrawal';
}

export function coverSubtitleForMode(inputs: CalculatorInputs): string {
  return inputs.mode === 'growth'
    ? 'Projected capital and progress toward your target future capital under the assumptions you selected.'
    : 'Capital runway, income gap, and depletion risk under your monthly withdrawal and return assumptions.';
}

function toneOpening(tone: StructuralTone): string {
  switch (tone) {
    case 'STRONG':
      return 'Your structure is on track';
    case 'STABLE':
      return 'Your structure is close';
    case 'UNDER_PRESSURE':
      return 'Your structure is under pressure';
    case 'AT_RISK':
      return 'Your structure is not on track';
  }
}

export function buildExecutiveSummaryBlocks(
  inputs: CalculatorInputs,
  result: SimulationResult,
  verdict: CapitalHealthVerdict,
  formatCurrency: (n: number) => string,
  formatNum: (n: number, d?: number) => string,
): { outcome: string; why: string; meaning: string } {
  const tone = structuralToneFromVerdict(verdict);
  const open = toneOpening(tone);
  const hy = formatNum(inputs.timeHorizonYears, inputs.timeHorizonYears % 1 === 0 ? 0 : 1);
  const infl = inputs.inflationEnabled
    ? `Inflation adjustment is on at ${formatNum(inputs.inflationPct, 1)}% (real return in the model).`
    : 'Inflation adjustment is off; returns are applied as entered.';

  if (inputs.mode === 'growth') {
    const proj = formatCurrency(result.nominalCapitalAtHorizon);
    const tgt = formatCurrency(inputs.targetFutureCapital);
    const start = formatCurrency(inputs.startingCapital);
    return {
      outcome: `${open}: over ${hy} years the model projects ${proj} versus your target of ${tgt} (starting capital ${start}).`,
      why: `Expected return is ${formatNum(inputs.expectedAnnualReturnPct, 1)}% with ${infl}`,
      meaning: `Verdict: ${verdict}. This is one path under fixed assumptions — revisit if returns, horizon, or contributions change materially.`,
    };
  }

  const gap = incomeGapMonthly(inputs, result);
  const sus = formatCurrency(
    (result as SimulationResult & { sustainableIncomeMonthly?: number }).sustainableIncomeMonthly ??
      result.monthlyReturnOnCapital ??
      result.passiveIncomeMonthly ??
      0,
  );
  const want = formatCurrency(inputs.targetMonthlyIncome);
  const runway =
    result.depletionMonth == null || result.depletionMonth >= 1200
      ? 'capital is not depleted within the model window on these settings.'
      : `capital is projected to deplete in ${formatNum(result.depletionMonth / 12, 1)} years on these settings.`;
  return {
    outcome: `${open}: desired income is ${want} per month versus sustainable portfolio return around ${sus} per month; structural gap about ${formatCurrency(gap)} per month.`,
    why: `${infl} At this draw, ${runway}`,
    meaning: `Verdict: ${verdict}. Use this as a diagnostic snapshot; adjust withdrawals, capital, or return assumptions in the live model to test alternatives.`,
  };
}

export function buildChartCaption(
  inputs: CalculatorInputs,
  result: SimulationResult,
  verdict: CapitalHealthVerdict,
  formatCurrency: (n: number) => string,
  formatNum: (n: number, d?: number) => string,
): string {
  const hy = formatNum(inputs.timeHorizonYears, inputs.timeHorizonYears % 1 === 0 ? 0 : 1);
  if (inputs.mode === 'growth') {
    const start = formatCurrency(inputs.startingCapital);
    const end = formatCurrency(result.nominalCapitalAtHorizon);
    const tgt = formatCurrency(inputs.targetFutureCapital);
    if (verdict === 'AT RISK' || verdict === 'BELOW TARGET') {
      return `Over ${hy} years capital moves from ${start} to ${end} versus target ${tgt} (${verdict}).`;
    }
    return `Capital grows from ${start} to ${end} over ${hy} years relative to target ${tgt} (${verdict}).`;
  }
  const gap = incomeGapMonthly(inputs, result);
  if (verdict === 'AT RISK') {
    return `Capital declines with a ${formatCurrency(gap)} monthly gap and is projected to be depleted before the ${hy}-year horizon.`;
  }
  if (verdict === 'SUSTAINABLE' || verdict === 'STABLE') {
    return `Capital trajectory over ${hy} years is consistent with ${verdict} under current withdrawals and return assumptions.`;
  }
  return `Capital declines under a ${formatCurrency(gap)} monthly gap through the ${hy}-year horizon (${verdict}).`;
}

export function buildChartAnnotationLines(
  inputs: CalculatorInputs,
  result: SimulationResult,
  verdict: CapitalHealthVerdict,
  formatCurrency: (n: number) => string,
  formatNum: (n: number, d?: number) => string,
): string[] {
  const hy = formatNum(inputs.timeHorizonYears, inputs.timeHorizonYears % 1 === 0 ? 0 : 1);
  if (inputs.mode === 'growth') {
    const lines = [
      `Capital grows to ${formatCurrency(result.nominalCapitalAtHorizon)} vs target ${formatCurrency(inputs.targetFutureCapital)}.`,
      `Horizon: ${hy} years · Return ${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
      `Verdict: ${verdict}`,
    ];
    return lines.slice(0, 4);
  }
  const gap = incomeGapMonthly(inputs, result);
  const lines = [
    `Capital path reflects a ${formatCurrency(gap)} monthly income gap.`,
    `Horizon: ${hy} years.`,
    depletedBeforeHorizon(inputs, result)
      ? 'Capital is depleted before the selected horizon.'
      : 'Capital remains through the selected horizon on these assumptions.',
    `Verdict: ${verdict}`,
  ];
  return lines.slice(0, 4);
}

export function buildVerdictSupportLine(
  inputs: CalculatorInputs,
  result: SimulationResult,
  verdict: CapitalHealthVerdict,
  formatCurrency: (n: number) => string,
): string | null {
  if (inputs.mode === 'growth') {
    return `Target ${formatCurrency(inputs.targetFutureCapital)} → Projected ${formatCurrency(result.nominalCapitalAtHorizon)}`;
  }
  const gap = incomeGapMonthly(inputs, result);
  if (verdict === 'AT RISK') {
    return `Gap ${formatCurrency(gap)}/mo → Depletion before horizon`;
  }
  if (gap > 0) return `Gap ${formatCurrency(gap)}/mo`;
  return null;
}

export function lionAlignmentPreamble(verdict: CapitalHealthVerdict, tone: StructuralTone): string {
  return `Structural read: ${verdict} (${toneOpening(tone).toLowerCase()}).`;
}

export function sanitizePlanCopy(line: string): string {
  return line
    .replace(/\bclient\b/gi, 'plan')
    .replace(/\badvisor\b/gi, '')
    .replace(/\bmeeting\b/gi, 'review')
    .replace(/\s+/g, ' ')
    .trim();
}
