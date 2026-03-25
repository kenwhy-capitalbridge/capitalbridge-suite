import type { CurrencyCode } from '../config/currency';
import { CURRENCIES } from '../config/currency';
import { COVERAGE_GREEN, COVERAGE_AMBER } from '../config/constants';
import type {
  IncomeRow,
  LoanRow,
  InvestmentBucket,
  MonthRow,
  YearRow,
  SummaryKPIs,
  SustainabilityStatus,
  AssetUnlock,
} from '../types/calculator';
import { monthlyPayment } from './amortize';
import {
  getUnlockedLiquidity,
  totalUnlockingCapitalSurplus,
  totalMonthlyInvestmentIncomeFromUnlocking,
} from './assetUnlockToLoans';

/** Monthly investment income from one bucket: allocation × (annual_return / 12). No compounding; payout only. */
function monthlyInvestmentIncomeFromBucket(bucket: InvestmentBucket): number {
  return bucket.allocation * (bucket.expectedReturnAnnual / 100 / 12);
}

/** Total monthly investment income from all buckets (payout only; no reinvestment). */
function totalBucketMonthlyInvestmentIncome(buckets: InvestmentBucket[]): number {
  return buckets.reduce((s, b) => s + monthlyInvestmentIncomeFromBucket(b), 0);
}

function totalRecurringIncome(incomeRows: IncomeRow[]): number {
  return incomeRows.reduce((s, r) => s + r.amount, 0);
}

/** Total portfolio value from buckets (no growth; snapshot only). */
function totalPortfolio(buckets: InvestmentBucket[]): number {
  return buckets.reduce((s, b) => s + b.allocation, 0);
}

/** Total unlocked liquidity from all asset unlocks. */
function totalUnlockedLiquidityFromAssets(assetUnlocks: AssetUnlock[]): number {
  return (assetUnlocks || []).reduce((s, a) => s + getUnlockedLiquidity(a), 0);
}

export interface SimulationInput {
  currency: CurrencyCode;
  monthlyExpenses: number;
  incomeRows: IncomeRow[];
  loans: LoanRow[];
  investmentBuckets: InvestmentBucket[];
  assetUnlocks?: AssetUnlock[];
}

export interface SimulationResult {
  monthlyRows: MonthRow[];
  yearlyRows: YearRow[];
  summary: SummaryKPIs;
  medianCoverage: number;
  worstMonthCoverage: number;
  yearsToDepletion: number | null;
}

/**
 * Single-month cash-flow snapshot. No time horizon, no compounding, no reinvestment.
 * Monthly Income = Recurring Income + Bucket Investment Income + Unlocking Capital Investment Income.
 * Total Expenses = Desired Monthly Expenses + Loan Repayments.
 * Net = Monthly Income − Total Expenses.
 */
export function runSimulation(input: SimulationInput): SimulationResult {
  const cfg = CURRENCIES[input.currency];
  const baseIncome = totalRecurringIncome(input.incomeRows);
  const bucketInvestmentIncome = totalBucketMonthlyInvestmentIncome(input.investmentBuckets);
  const unlockingInvestmentIncome = totalMonthlyInvestmentIncomeFromUnlocking(
    input.assetUnlocks || []
  );
  const totalLoanRepayment =
    input.loans.length > 0
      ? input.loans
          .map((l) => monthlyPayment(l.principal, l.annualRate, l.tenureYears))
          .reduce((a, b) => a + b, 0)
      : 0;

  const totalIncome = baseIncome + bucketInvestmentIncome + unlockingInvestmentIncome;
  const totalExpenses = input.monthlyExpenses + totalLoanRepayment;
  const net = totalIncome - totalExpenses;

  const portfolioValue = totalPortfolio(input.investmentBuckets);
  const totalUnlockedLiquidity = totalUnlockedLiquidityFromAssets(input.assetUnlocks || []);
  const unlockingSurplus = totalUnlockingCapitalSurplus(input.assetUnlocks || []);

  let invalidScenario = false;
  if (input.monthlyExpenses > cfg.maxMonthlyExpenses) invalidScenario = true;

  const denominator = input.monthlyExpenses + totalLoanRepayment;
  const coverageRatio =
    denominator > 0
      ? (baseIncome + bucketInvestmentIncome + unlockingInvestmentIncome) / denominator
      : 0;

  const monthlyRows: MonthRow[] = [
    {
      period: 1,
      startingPortfolio: portfolioValue,
      newContributions: 0,
      investmentReturn: bucketInvestmentIncome,
      endingPortfolio: portfolioValue,
      monthlyIncome: baseIncome,
      estimatedInvestmentIncome: bucketInvestmentIncome + unlockingInvestmentIncome,
      loanRepayments: totalLoanRepayment,
      expenses: input.monthlyExpenses,
      netSurplusShortfall: net,
      coverageRatio,
    },
  ];

  let sustainabilityStatus: SustainabilityStatus = 'invalid';
  if (invalidScenario) {
    sustainabilityStatus = 'invalid';
  } else if (coverageRatio >= COVERAGE_GREEN) {
    sustainabilityStatus = 'green';
  } else if (coverageRatio >= COVERAGE_AMBER) {
    sustainabilityStatus = 'amber';
  } else {
    sustainabilityStatus = 'red';
  }

  const summary: SummaryKPIs = {
    monthlyIncome: baseIncome,
    monthlyExpenses: input.monthlyExpenses,
    monthlyLoanRepayments: totalLoanRepayment,
    estimatedMonthlyInvestmentIncome: bucketInvestmentIncome + unlockingInvestmentIncome,
    netMonthlySurplusShortfall: net,
    sustainabilityStatus,
    invalidReason: invalidScenario ? `Exceeds ${input.currency} Limits` : undefined,
    totalUnlockedLiquidity,
    totalUnlockingCapitalSurplus: unlockingSurplus,
  };

  return {
    monthlyRows,
    yearlyRows: [] as YearRow[],
    summary,
    medianCoverage: coverageRatio,
    worstMonthCoverage: coverageRatio,
    yearsToDepletion: null,
  };
}
