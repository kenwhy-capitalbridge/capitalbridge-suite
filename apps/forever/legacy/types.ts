export interface CalculationResult {
  monthlyExpense: number;
  annualExpense: number;
  propertyMonthlyRepayment: number;
  familyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  realReturnRate: number;
  capitalNeeded: number;
  currentAssets: number;
  assetBreakdown: {
    cash: number;
    investments: number;
    realEstate: number;
  };
  gap: number;
  progressPercent: number;
  isSustainable: boolean;
}

export enum ExpenseType {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL'
}