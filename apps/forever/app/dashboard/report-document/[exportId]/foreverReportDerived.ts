import { computeForeverResults } from "@/legacy/foreverModel";
import type { ForeverModelInputs } from "@/legacy/foreverModel";
import { ExpenseType } from "@/legacy/types";

const GREEN = "#0D3A1D";
const GREEN_MID = "#1B4D3E";
const MUTED = "#5c6b62";
const ACCENT = "#FFCC6A";
const SUPPORT = "#55b685";
const NEED = "#1B4D3E";
const GAP = "#cd5b52";

export const FOREVER_REPORT_CHART_COLORS = {
  green: GREEN,
  greenMid: GREEN_MID,
  muted: MUTED,
  accent: ACCENT,
  support: SUPPORT,
  need: NEED,
  gap: GAP,
} as const;

export type ForeverCalculatorBundle = {
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
};

function num(o: Record<string, unknown>, key: string): number | null {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === "string" ? v : "";
}

export function parseForeverModelInputs(raw: Record<string, unknown>): ForeverModelInputs | null {
  const expenseTypeRaw = str(raw, "expenseType").toUpperCase();
  const expenseType = expenseTypeRaw === "ANNUAL" ? ExpenseType.ANNUAL : ExpenseType.MONTHLY;
  const expense = num(raw, "expense");
  const familyContribution = num(raw, "familyContribution");
  const expectedReturn = num(raw, "expectedReturn");
  const inflationRate = num(raw, "inflationRate");
  const cash = num(raw, "cash");
  const investments = num(raw, "investments");
  const realEstate = num(raw, "realEstate");
  const propertyLoanCost = num(raw, "propertyLoanCost");
  const propertyTimeHorizon = num(raw, "propertyTimeHorizon");
  if (
    expense === null ||
    familyContribution === null ||
    expectedReturn === null ||
    inflationRate === null ||
    cash === null ||
    investments === null ||
    realEstate === null ||
    propertyLoanCost === null ||
    propertyTimeHorizon === null
  ) {
    return null;
  }
  return {
    expenseType,
    expense,
    familyContribution,
    expectedReturn,
    inflationRate,
    cash,
    investments,
    realEstate,
    propertyLoanCost,
    propertyTimeHorizon,
  };
}

export type ForeverDerivedModel = ReturnType<typeof deriveForeverReportModel>;

export function deriveForeverReportModel(bundle: ForeverCalculatorBundle) {
  const inputs = parseForeverModelInputs(bundle.inputs);
  if (!inputs) return null;
  const computed = computeForeverResults(inputs);

  const cur = str(bundle.inputs, "currency") || "RM";
  const r = computed.realReturnRate / 100;
  const monthlyNeed = computed.monthlyExpense;
  const monthlySupported =
    computed.isSustainable && r > 0
      ? Math.min(monthlyNeed, (computed.currentAssets * r) / 12)
      : 0;
  const monthlyGap = Math.max(0, monthlyNeed - monthlySupported);

  const baseAnnualExpense =
    inputs.expenseType === ExpenseType.MONTHLY ? inputs.expense * 12 : inputs.expense;
  const annualContribution =
    inputs.expenseType === ExpenseType.MONTHLY ? inputs.familyContribution * 12 : inputs.familyContribution;
  const propertyAnnual = computed.propertyMonthlyRepayment * 12;

  const waterfall = {
    lifestyleAnnual: baseAnnualExpense,
    propertyAnnual,
    contributionAnnual: annualContribution,
    netAnnualDraw: computed.annualExpense,
  };

  const liquid = computed.assetBreakdown.cash;
  const semi = computed.assetBreakdown.investments;
  const illiquid = computed.assetBreakdown.realEstate;
  const totalStack = liquid + semi + illiquid || 1;

  const capitalCurve = buildCapitalCurve(
    computed.currentAssets,
    computed.annualExpense,
    r,
    computed.isSustainable ? 40 : 50,
  );

  const depletionYear = findDepletionYear(capitalCurve);

  const liquidityHaircuts = [0.6, 0.7, 0.8, 1].map((pct) => ({
    pct,
    effective: liquid + semi + illiquid * pct,
  }));

  const baseReturn = inputs.expectedReturn;
  const baseInflation = inputs.inflationRate;
  const sensitivityReturn = [-1, 0, 1].map((delta) => {
    const next = { ...inputs, expectedReturn: baseReturn + delta };
    const res = computeForeverResults(next);
    return { label: `${(baseReturn + delta).toFixed(1)}%`, years: runwayToYears(res.runway) };
  });
  const sensitivityInflation = [-1, 0, 1].map((delta) => {
    const next = { ...inputs, inflationRate: baseInflation + delta };
    const res = computeForeverResults(next);
    return { label: `${(baseInflation + delta).toFixed(1)}%`, years: runwayToYears(res.runway) };
  });

  return {
    inputs,
    computed,
    currencyCode: cur,
    monthlyNeed,
    monthlySupported,
    monthlyGap,
    waterfall,
    stack: { liquid, semi, illiquid, totalStack },
    capitalCurve,
    depletionYear,
    liquidityHaircuts,
    sensitivityReturn,
    sensitivityInflation,
    baseReturn,
    baseInflation,
  };
}

function runwayToYears(runway: string): number | null {
  const m = runway.match(/([\d.]+)\s*years?/i);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

function buildCapitalCurve(
  startCapital: number,
  annualWithdrawal: number,
  realReturnDecimal: number,
  maxYears: number,
): { year: number; balance: number }[] {
  const out: { year: number; balance: number }[] = [];
  let balance = startCapital;
  for (let y = 0; y <= maxYears; y++) {
    out.push({ year: y, balance: Math.max(0, balance) });
    if (balance <= 0 || annualWithdrawal <= 0) break;
    balance = balance * (1 + realReturnDecimal) - annualWithdrawal;
  }
  return out;
}

function findDepletionYear(curve: { year: number; balance: number }[]): number | null {
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].balance <= 0 && curve[i - 1].balance > 0) {
      return curve[i].year;
    }
  }
  return null;
}
