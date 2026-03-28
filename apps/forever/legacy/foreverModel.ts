import type { CalculationResult } from "./types";
import { ExpenseType } from "./types";

export type ForeverRunwayResult = CalculationResult & { runway: string };

export interface ForeverModelInputs {
  expenseType: ExpenseType;
  expense: number;
  familyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  cash: number;
  investments: number;
  realEstate: number;
  propertyLoanCost: number;
  propertyTimeHorizon: number;
}

/** Pure projection used by the Forever UI and sample PDF script (keep in sync with App useMemo). */
export function computeForeverResults(inputs: ForeverModelInputs): ForeverRunwayResult {
  const {
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
  } = inputs;

  const baseAnnualExpense = expenseType === ExpenseType.MONTHLY ? expense * 12 : expense;

  let propertyMonthlyRepayment = 0;
  if (realEstate > 0 && propertyTimeHorizon > 0) {
    const annualRate = propertyLoanCost / 100;
    const monthlyRate = annualRate / 12;
    const totalMonths = propertyTimeHorizon * 12;

    if (monthlyRate === 0) {
      propertyMonthlyRepayment = realEstate / totalMonths;
    } else {
      propertyMonthlyRepayment = (realEstate * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
    }
  }

  const annualContribution = expenseType === ExpenseType.MONTHLY ? familyContribution * 12 : familyContribution;
  const totalGrossAnnualExpense = baseAnnualExpense + propertyMonthlyRepayment * 12;
  const netAnnualExpense = Math.max(0, totalGrossAnnualExpense - annualContribution);
  const netMonthlyExpense = netAnnualExpense / 12;

  const realReturnRateDecimal = (expectedReturn - inflationRate) / 100;
  const isSustainable = realReturnRateDecimal > 0;
  const capitalNeeded = isSustainable ? netAnnualExpense / realReturnRateDecimal : netAnnualExpense > 0 ? Infinity : 0;

  const totalAssets = cash + investments + realEstate;
  const gap = isSustainable ? Math.max(0, capitalNeeded - totalAssets) : 0;
  const progressPercent = isSustainable ? (capitalNeeded === 0 ? 100 : Math.min(100, (totalAssets / capitalNeeded) * 100)) : 0;

  let runway = "0 years";
  if (netAnnualExpense <= 0) {
    runway = "Perpetual";
  } else {
    const C = totalAssets;
    const W = netAnnualExpense;
    const r = realReturnRateDecimal;

    if (r > 0) {
      if (C * r >= W) {
        runway = "Perpetual";
      } else {
        const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
        runway = `${years.toFixed(1)} years`;
      }
    } else if (r === 0) {
      runway = `${(C / W).toFixed(1)} years`;
    } else {
      const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
      runway = !Number.isNaN(years) ? `${years.toFixed(1)} years` : "0 years";
    }
  }

  return {
    monthlyExpense: netMonthlyExpense,
    annualExpense: netAnnualExpense,
    propertyMonthlyRepayment,
    familyContribution: annualContribution / 12,
    expectedReturn,
    inflationRate,
    realReturnRate: realReturnRateDecimal * 100,
    capitalNeeded,
    currentAssets: totalAssets,
    assetBreakdown: { cash, investments, realEstate },
    gap,
    progressPercent,
    isSustainable,
    runway,
  };
}
