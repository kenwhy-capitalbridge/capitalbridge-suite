
export enum CategoryType {
  STRUCTURED_DEBT = 'Lower‑Cost Loan Option',
  EMPLOYER_LINKED = 'Early Bonus Access',
  GRANTS_SUBSIDIES = 'Matched Savings Support',
  ASSET_RELEASE = 'Property or Asset Cash‑Out',
  PRIVATE_CAPITAL = 'Family, Private Support or Income',
  BUSINESS_LINKED = 'Business‑Linked Capital',
  RETIREMENT_SAVINGS = 'RETIREMENT SAVINGS'
}

export interface EnhancementOption {
  id: string;
  category: CategoryType;
  name: string;
  description: string;
  oneTimeAmount: number;
  monthlyContribution: number;
  repaymentRate: number; // Annual interest or cost rate (EIR) or Fund Return %
  durationMonths: number;
  isActive: boolean;
}

export interface StressScenario {
  name: string;
  initialCapital: number;
  availableCapital: number;
  investmentFunds: number;
  investmentReturn: number;
  requiredCapital: number;
  gap: number;
}

export interface ImpactMetrics {
  totalCapitalAdded: number;
  netImpact: number;
  monthlyCashflowImpact: number;
  monthlyReturnFromNewCapital: number;
  netMonthlyFlow: number;
  isSustainable: boolean;
  totalMonthlyRepayment: number;
  foreverCapitalPercentage: number;
  depletionMonths: number | null; // null if sustainable
  debtClearingMonths: number;
  estimatedFutureSum: number;
  debtBreakdown: Array<{ name: string; amount: number; durationYears: number }>;
}
