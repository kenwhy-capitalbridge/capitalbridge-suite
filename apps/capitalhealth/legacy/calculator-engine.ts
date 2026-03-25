/**
 * Capital Growth Calculator 2.0 – simulation engine
 * MonthlyReturnRate = (1 + AnnualReturn)^(1/12) − 1
 * Cash buffer % of total held as cash (earns CashAPY); remainder invested.
 * Reinvestment split: share of monthly returns reinvested before withdrawals.
 */

import type { CalculatorInputs, MonthSnapshot, SimulationResult } from './calculator-types';
import { PRESETS } from './calculator-types';

const MONTHS_PER_YEAR = 12;
const MAX_ANNUAL_RETURN_PCT = 15;
const MIN_ANNUAL_RETURN_PCT = 0;
/** Max months to simulate in withdrawal mode to find true depletion (Duration of Funds) */
const MAX_DEPLETION_MONTHS = 600;

function clampReturn(pct: number): number {
  return Math.max(MIN_ANNUAL_RETURN_PCT, Math.min(MAX_ANNUAL_RETURN_PCT, pct));
}

function monthlyRateFromAnnual(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / MONTHS_PER_YEAR) - 1;
}

function getWithdrawalAmount(
  inputs: CalculatorInputs,
  totalCapital: number,
  cashBalance: number,
  bufferAmount: number
): number {
  if (inputs.mode === 'growth') return 0;
  if (totalCapital <= 0) return 0;

  if (inputs.withdrawalRule === 'fixed') {
    return Math.min(inputs.targetMonthlyIncome, Math.max(0, totalCapital - bufferAmount));
  }
  const pct = inputs.withdrawalPctOfCapital / 100;
  return totalCapital * pct;
}

/** Nominal monthly rate r = R/12. Portfolio earns r×P per month. */
function nominalMonthlyRate(annualReturnPct: number): number {
  return annualReturnPct / 100 / MONTHS_PER_YEAR;
}

/**
 * Time to depletion: B_{t+1} = B_t(1+r) - W (discrete, end-of-period: interest then withdrawal).
 * N = ln(W / (W - rP)) / ln(1+r) months. Valid if W > rP. If W ≤ rP → sustainable.
 */
function formulaMonthsToDepletionExact(P: number, r: number, W: number): number | null {
  const rP = r * P;
  if (W <= rP || W <= 0) return null;
  const numerator = Math.log(W / (W - rP));
  const denominator = Math.log(1 + r);
  return numerator / denominator;
}

/** Iterative: whole months of payouts until balance ≤ 0. */
function formulaMonthsToDepletionWhole(P: number, r: number, W: number, maxMonths = 600): number {
  let balance = P;
  let m = 0;
  while (balance > 0 && m < maxMonths) {
    balance = balance * (1 + r) - W;
    m++;
  }
  return m;
}

export function runSimulation(inputs: CalculatorInputs): SimulationResult {
  const monthsTotal = Math.round(inputs.timeHorizonYears * MONTHS_PER_YEAR) || 1;
  // When inflation adjustment is ON, use real return (expected − inflation) for the simulation
  const annualReturn =
    inputs.inflationEnabled
      ? clampReturn(Math.max(0.01, inputs.expectedAnnualReturnPct - inputs.inflationPct))
      : clampReturn(inputs.expectedAnnualReturnPct);
  const monthlyInvestReturn = monthlyRateFromAnnual(annualReturn);
  const monthlyCashReturn = monthlyRateFromAnnual(inputs.cashAPY);
  const reinvestPct = inputs.reinvestmentSplitPct / 100;
  const bufferPct = inputs.cashBufferPct / 100;

  const snapshots: MonthSnapshot[] = [];
  let totalCapital = inputs.startingCapital;
  let totalWithdrawalsPaid = 0;
  let totalContributions = inputs.startingCapital;
  let depletionMonth: number | null = null;
  let bufferBreachConsecutive = 0;
  let maxBufferBreach = 0;

  // In withdrawal mode, run until depletion or max months so Duration of Funds is accurate
  const runMonths =
    inputs.mode === 'withdrawal'
      ? Math.max(monthsTotal, MAX_DEPLETION_MONTHS)
      : monthsTotal;

  for (let m = 0; m < runMonths; m++) {
    const bufferAmount = totalCapital * bufferPct;
    const cashBalance = bufferAmount;
    const investedCapital = totalCapital - cashBalance;

    const cashReturn = cashBalance * monthlyCashReturn;
    const investReturn = investedCapital * monthlyInvestReturn;
    const totalReturn = cashReturn + investReturn;

    const reinvested = totalReturn * reinvestPct;

    let withdrawal = getWithdrawalAmount(inputs, totalCapital, cashBalance, bufferAmount);
    const needFromInvested = Math.max(0, withdrawal - cashBalance);
    const bufferBreached = needFromInvested > 0 && investedCapital < needFromInvested;

    if (bufferBreached || totalCapital < withdrawal) {
      withdrawal = Math.min(withdrawal, Math.max(0, totalCapital));
      if (totalCapital <= 0) {
        if (depletionMonth === null) depletionMonth = m + 1;
        break;
      }
      bufferBreachConsecutive++;
      maxBufferBreach = Math.max(maxBufferBreach, bufferBreachConsecutive);
    } else {
      bufferBreachConsecutive = 0;
    }

    totalCapital = totalCapital + reinvested + (inputs.monthlyTopUp || 0) - withdrawal;
    totalWithdrawalsPaid += withdrawal;
    // Count contributions only over the user's horizon (not the extended run used for depletion)
    if (inputs.monthlyTopUp && m < monthsTotal) totalContributions += inputs.monthlyTopUp;

    if (totalCapital <= 0 && depletionMonth === null) depletionMonth = m + 1;

    // Only keep snapshots up to the user's time horizon (for charts and outcome)
    if (m < monthsTotal) {
      snapshots.push({
        monthIndex: m,
        totalCapital,
        investedCapital: totalCapital - totalCapital * bufferPct,
        cashBalance: totalCapital * bufferPct,
        withdrawalPaid: withdrawal,
      });
    }

    if (totalCapital <= 0) break;
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  const last12Raw = snapshots.slice(-12).map((s) => s.totalCapital);
  const last12MonthsCapital: number[] =
    last12Raw.length >= 12
      ? last12Raw
      : [...Array(12 - last12Raw.length).fill(last12Raw[0] ?? 0), ...last12Raw];
  const nominalAtHorizon = lastSnapshot?.totalCapital ?? 0;
  const realAtHorizon = nominalAtHorizon;

  // effectiveAnnualReturnPct matches the return used in the simulation (real when inflation on)
  const effectiveAnnualReturnPct = annualReturn;
  const rNominal = nominalMonthlyRate(effectiveAnnualReturnPct);
  const P = inputs.startingCapital;
  // Sustainable income = yield on current capital only. Do not treat future top-ups as lump-sum
  // (they are added month-by-month in the simulation); otherwise coverage would be overstated.
  const monthlyReturnOnCapital = inputs.mode === 'withdrawal' ? rNominal * P : 0;

  let formulaSustainable = false;
  let formulaDepletionMonthsExact: number | null = null;
  let formulaDepletionMonthsWhole: number | null = null;
  if (inputs.mode === 'withdrawal') {
    const W = inputs.targetMonthlyIncome;
    formulaSustainable = W <= monthlyReturnOnCapital;
    if (!formulaSustainable && W > 0) {
      formulaDepletionMonthsExact = formulaMonthsToDepletionExact(P, rNominal, W);
      formulaDepletionMonthsWhole = formulaMonthsToDepletionWhole(P, rNominal, W);
    }
  }

  // Passive Income: in withdrawal mode use r×P (no double-count); in growth use capital+cash returns
  const passiveIncomeMonthly =
    inputs.mode === 'withdrawal'
      ? monthlyReturnOnCapital
      : (() => {
          const cashAmount = inputs.startingCapital * bufferPct;
          const investedAmount = inputs.startingCapital * (1 - bufferPct);
          const annualReturnInvested = investedAmount * (annualReturn / 100);
          const annualReturnCash = cashAmount * (inputs.cashAPY / 100);
          return (annualReturnInvested + annualReturnCash) / MONTHS_PER_YEAR;
        })();

  const targetIncome = inputs.targetMonthlyIncome || 1;
  const targetFutureCapital = inputs.targetFutureCapital || 1;
  const outcome = inputs.mode === 'withdrawal'
    ? getWithdrawalAmount(
        inputs,
        lastSnapshot?.totalCapital ?? 0,
        (lastSnapshot?.totalCapital ?? 0) * bufferPct,
        (lastSnapshot?.totalCapital ?? 0) * bufferPct
      )
    : 0;

  // Withdrawal: Coverage = (r×P / W)×100 — how much of target income is covered by monthly return on capital
  const coveragePct = inputs.mode === 'withdrawal'
    ? (targetIncome > 0 ? (monthlyReturnOnCapital / targetIncome) * 100 : 0)
    : (targetFutureCapital > 0 ? (nominalAtHorizon / targetFutureCapital) * 100 : 100);

  let status: SimulationResult['status'] = 'unsustainable';
  if (inputs.mode === 'growth') {
    if (coveragePct >= 100) status = 'sustainable';
    else if (coveragePct >= 81) status = 'plausible';
    else status = 'unsustainable';
  } else {
    if (formulaSustainable) status = 'sustainable';
    else if (coveragePct >= 100 && depletionMonth === null && maxBufferBreach === 0) status = 'sustainable';
    else if (coveragePct >= 100 && maxBufferBreach > 0 && maxBufferBreach <= 12) status = 'plausible';
    else if (coveragePct >= 81 && coveragePct <= 99) status = 'plausible';
    else if (coveragePct >= 100 && depletionMonth === null && maxBufferBreach <= 12) status = 'plausible';
    else if (coveragePct <= 80 || depletionMonth !== null) status = 'unsustainable';
    // If time horizon is longer than capital depletion, plan is unsustainable
    const horizonMonths = inputs.timeHorizonYears * MONTHS_PER_YEAR;
    const depletionMonthsToUse =
      inputs.monthlyTopUp !== 0 ? depletionMonth : formulaDepletionMonthsWhole;
    if (depletionMonthsToUse != null && horizonMonths > depletionMonthsToUse) status = 'unsustainable';
  }

  // Simulation is the single source of truth for "how long money lasts": if the month-by-month
  // run depletes capital, show that everywhere (header, KEY OUTCOMES, chart badge). Only show
  // "Forever Income" when the simulation never hits zero (depletionMonth === null). The simple
  // formula (W ≤ r×P) can say sustainable while the full simulation (buffer, reinvestment) depletes.
  const useSimulationRunway = inputs.monthlyTopUp !== 0 && inputs.mode === 'withdrawal';
  let runwayPhrase: string;
  if (inputs.mode === 'withdrawal' && depletionMonth !== null) {
    const durationMonths = depletionMonth;
    const years = Math.floor(durationMonths / 12);
    const months = durationMonths % 12;
    runwayPhrase = `Runs out in ${years} years ${months} months`;
  } else if (useSimulationRunway) {
    if (depletionMonth === null) {
      runwayPhrase = 'Forever Income Achieved';
      if (inputs.withdrawalRule === 'pct_capital') {
        runwayPhrase += '. Auto-rightsizes with your capital to reduce depletion risk.';
      }
    } else {
      const durationMonths = depletionMonth;
      const years = Math.floor(durationMonths / 12);
      const months = durationMonths % 12;
      runwayPhrase = `Runs out in ${years} years ${months} months`;
    }
  } else if (inputs.mode === 'withdrawal' && formulaSustainable) {
    runwayPhrase = 'Forever Income Achieved';
  } else if (inputs.mode === 'withdrawal' && formulaDepletionMonthsWhole != null) {
    const months = formulaDepletionMonthsWhole;
    const years = Math.floor(months / 12);
    const monthsRem = Math.round(months % 12);
    runwayPhrase = monthsRem === 0
      ? `~${months} months (≈${years} years)`
      : `~${months} months (≈${years} years ${monthsRem} months)`;
  } else if (depletionMonth === null) {
    runwayPhrase = 'Forever Income Achieved';
    if (inputs.mode === 'withdrawal' && inputs.withdrawalRule === 'pct_capital') {
      runwayPhrase += '. Auto-rightsizes with your capital to reduce depletion risk.';
    }
  } else {
    const durationMonths = depletionMonth!;
    const years = Math.floor(durationMonths / 12);
    const months = durationMonths % 12;
    runwayPhrase = `Runs out in ${years} years ${months} months`;
  }

  const projectedMonthlyAtHorizon =
    inputs.mode === 'growth' && nominalAtHorizon > 0
      ? (nominalAtHorizon * (inputs.withdrawalPctOfCapital / 100)) || 0
      : 0;

  return {
    monthlySnapshots: snapshots,
    last12MonthsCapital,
    currentOutcome: outcome,
    passiveIncomeMonthly,
    projectedMonthlyIncomeAtHorizon: projectedMonthlyAtHorizon,
    totalWithdrawalsPaid,
    totalContributions,
    nominalCapitalAtHorizon: nominalAtHorizon,
    realCapitalAtHorizon: realAtHorizon ?? nominalAtHorizon,
    depletionMonth,
    bufferBreachMonths: maxBufferBreach,
    status,
    coveragePct,
    runwayPhrase,
    monthlyReturnOnCapital: inputs.mode === 'withdrawal' ? monthlyReturnOnCapital : undefined,
    formulaSustainable,
    formulaDepletionMonthsExact,
    formulaDepletionMonthsWhole,
  };
}

export function applyPreset(
  preset: keyof typeof PRESETS,
  mode: 'growth' | 'withdrawal'
): Partial<CalculatorInputs> {
  const p = PRESETS[preset];
  const reinvestment =
    mode === 'growth' ? 100 : preset === 'aggressive' ? 95 : p.reinvestmentSplitPct;
  return {
    riskPreset: preset,
    expectedAnnualReturnPct: p.annualReturn,
    cashBufferPct: p.cashBufferPct,
    cashAPY: p.cashAPY,
    reinvestmentSplitPct: reinvestment,
    withdrawalPctOfCapital: p.withdrawalPctOfCapital,
  };
}
