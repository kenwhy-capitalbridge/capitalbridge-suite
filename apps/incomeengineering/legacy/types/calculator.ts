import type { CurrencyCode } from '../config/currency';

/** Single income row */
export interface IncomeRow {
  id: string;
  label: string;
  amount: number; // monthly
}

/** Unlock mechanism type */
export type UnlockMechanismType =
  | 'refinancing'
  | 'sploc'
  | 'sbl'
  | 'fd_pledge'
  | 'life_policy'
  | 'term_loan'
  | 'short_term_loan'
  | 'asset_sale';

/** Base asset/unlock entry */
export interface AssetUnlockBase {
  id: string;
  enabled: boolean;
  mechanism: UnlockMechanismType;
  label?: string;
  /** Est. investment return % when reinvesting unlocked liquidity (default 8) */
  estimatedInvestmentReturnPercent?: number;
  /** Est. monthly yield from this asset (e.g. rental); surplus = this − loan repayment, used to offset expenses */
  estimatedMonthlyYield?: number;
}

export interface RefinancingParams {
  currentValue: number;
  targetLTV: number;
  interestRate: number; // annual %
  tenureYears: number;
}

export interface SPLOCParams {
  portfolioValue: number;
  allowedLTV: number; // e.g. 50–70
  interestRate: number;
  tenureYears: number;
  marginCallBufferPercent: number;
}

export interface SBLParams {
  portfolioValue: number;
  advanceRate: number; // %
  rate: number;
  tenureYears: number;
}

export interface FDPledgeParams {
  depositValue: number;
  advanceRate: number;
  rate: number;
  tenureYears: number;
}

export interface LifePolicyParams {
  cashSurrenderValue: number;
  advanceRate: number;
  rate: number;
  tenureYears: number;
}

export interface TermLoanParams {
  amount: number;
  rate: number;
  tenureYears: number;
}

export interface ShortTermLoanParams {
  amount: number;
  rate: number;
  tenureYears: number;
}

export interface AssetSaleParams {
  currentValue: number;
  percentToSell: number;
  feesPercent: number;
  taxesPercent: number;
  useProceedsFor: 'debt_paydown' | 'investments';
}

export type UnlockParams =
  | RefinancingParams
  | SPLOCParams
  | SBLParams
  | FDPledgeParams
  | LifePolicyParams
  | TermLoanParams
  | ShortTermLoanParams
  | AssetSaleParams;

export interface AssetUnlock extends AssetUnlockBase {
  params: UnlockParams;
}

/** Loan row (derived from mechanisms or manual); used for amortization */
export interface LoanRow {
  id: string;
  label: string;
  principal: number;
  annualRate: number; // %
  tenureYears: number;
  startMonthIndex: number; // 0 = first month
  feesUpfront: number;
  feesOngoing: number; // e.g. monthly
}

/** Investment bucket */
export interface InvestmentBucket {
  id: string;
  label: string;
  allocation: number;
  expectedReturnAnnual: number; // 0–15, step 0.1
  riskNote?: string;
  includeInReinvest: boolean;
}

/** Sustainability status */
export type SustainabilityStatus = 'green' | 'amber' | 'red' | 'invalid';

/** One month in the simulation */
export interface MonthRow {
  period: number; // 1-based month index
  startingPortfolio: number;
  newContributions: number;
  investmentReturn: number;
  endingPortfolio: number;
  monthlyIncome: number;
  estimatedInvestmentIncome: number;
  loanRepayments: number;
  expenses: number;
  netSurplusShortfall: number;
  coverageRatio: number;
}

/** One year in the yearly view */
export interface YearRow {
  year: number;
  startingPortfolio: number;
  contributions: number;
  investmentReturn: number;
  endingPortfolio: number;
  avgMonthlyIncome: number;
  avgMonthlyLoanRepayments: number;
  avgMonthlyExpenses: number;
  coverageRatio: number;
}

/** Store state */
export interface CalculatorState {
  currency: CurrencyCode;
  timeHorizonYears: number;
  monthlyExpenses: number;
  incomeRows: IncomeRow[];
  assetUnlocks: AssetUnlock[];
  loans: LoanRow[];
  investmentBuckets: InvestmentBucket[];
  flatTaxOnReturns: boolean;
  flatTaxRate: number;
}

/** KPI summary */
export interface SummaryKPIs {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyLoanRepayments: number;
  estimatedMonthlyInvestmentIncome: number;
  netMonthlySurplusShortfall: number;
  sustainabilityStatus: SustainabilityStatus;
  invalidReason?: string; // e.g. "Exceeds RM Limits"
  /** Total unlocked liquidity from Unlocking Capital (not reinvested; offsets expenses via deficit only) */
  totalUnlockedLiquidity?: number;
  /** Monthly surplus from Unlocking Capital (yield − loan repayments per asset), used to offset expenses */
  totalUnlockingCapitalSurplus?: number;
}
