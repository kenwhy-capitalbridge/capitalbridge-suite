
export enum CalculationMode {
  SUSTAINABILITY = 'SUSTAINABILITY',
  ACCUMULATION = 'ACCUMULATION'
}

export interface CalculationResult {
  monthlyExpense: number;
  annualExpense: number;
  expectedReturn: number;
  inflationRate: number;
  realReturnRate: number;
  capitalNeeded: number;
  currentAssets: number;
  assetBreakdown: {
    salarySavings: number;
    familyContribution: number;
    realEstate: number;
    realEstateEIR?: number;
    realEstateHorizon?: number;
    marketGrowth: number;
    marketIncome: number;
    marketDefensive: number;
    marketAlternatives: number;
  };
  realEstateRepayment: number;
  totalMonthlyOutflow: number;
  totalAnnualOutflow: number;
  gap: number;
  progressPercent: number;
  isSustainable: boolean;
  // Growth specific
  compoundingYears?: number;
  futureValue?: number;
  totalGrowth?: number;
}

export enum ExpenseType {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL'
}