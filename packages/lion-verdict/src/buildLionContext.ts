export type LionContextInput = {
  currency?: string;
  monthlyIncome?: number;
  monthlyExpense?: number;
  totalCapital?: number;
  targetCapital?: number;
  coverageRatio?: number;
  sustainabilityYears?: number;
  lionScore?: number;
  depletionPressure?: string | number;
  modelType?: "FOREVER" | "HEALTH" | "STRESS" | "IE";
};

export type LionContext = {
  currency?: string;
  monthlyIncome?: number;
  monthlyExpense?: number;
  netMonthly?: number;
  totalCapital?: number;
  targetCapital?: number;
  capitalGap?: number;
  coverageRatio?: number;
  sustainabilityYears?: number;
  lionScore?: number;
  depletionPressure?: string | number;
  modelType?: LionContextInput["modelType"];
};

export function buildLionContext(input: LionContextInput): LionContext {
  const hasMonthlyIncome = typeof input.monthlyIncome === "number";
  const hasMonthlyExpense = typeof input.monthlyExpense === "number";
  const hasCapital = typeof input.totalCapital === "number";
  const hasTarget = typeof input.targetCapital === "number";

  return {
    currency: input.currency,
    monthlyIncome: input.monthlyIncome,
    monthlyExpense: input.monthlyExpense,
    netMonthly:
      hasMonthlyIncome && hasMonthlyExpense
        ? input.monthlyIncome! - input.monthlyExpense!
        : undefined,
    totalCapital: input.totalCapital,
    targetCapital: input.targetCapital,
    capitalGap: hasCapital && hasTarget ? input.targetCapital! - input.totalCapital! : undefined,
    coverageRatio: input.coverageRatio,
    sustainabilityYears: input.sustainabilityYears,
    lionScore: input.lionScore,
    depletionPressure: input.depletionPressure,
    modelType: input.modelType,
  };
}
