/** Capital Growth Calculator 2.0 – types and presets */

export type Mode = 'growth' | 'withdrawal';

export type RiskPreset = 'conservative' | 'balanced' | 'aggressive';

export type WithdrawalRule = 'fixed' | 'pct_capital';

export type YieldBoost = 'conservative' | 'balanced' | 'aggressive';

export type StatusKind = 'sustainable' | 'plausible' | 'unsustainable';

export const CURRENCIES = [
  { code: 'RM', symbol: 'RM' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'USD', symbol: '$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'RMB', symbol: '¥' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'THB', symbol: '฿' },
  { code: 'PHP', symbol: '₱' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export interface PresetValues {
  annualReturn: number;
  cashBufferPct: number;
  cashAPY: number;
  reinvestmentSplitPct: number; // % reinvested
  withdrawalPctOfCapital: number; // only for withdrawal mode
  inflationPct: number;
}

export const PRESETS: Record<RiskPreset, PresetValues> = {
  conservative: {
    annualReturn: 5.0,
    cashBufferPct: 20,
    cashAPY: 3.0,
    reinvestmentSplitPct: 80,
    withdrawalPctOfCapital: 0.4,
    inflationPct: 2.0,
  },
  balanced: {
    annualReturn: 8.0,
    cashBufferPct: 15,
    cashAPY: 3.5,
    reinvestmentSplitPct: 90,
    withdrawalPctOfCapital: 0.6,
    inflationPct: 2.0,
  },
  aggressive: {
    annualReturn: 12.0,
    cashBufferPct: 10,
    cashAPY: 4.0,
    reinvestmentSplitPct: 100, // growth; withdrawal uses 95/5
    withdrawalPctOfCapital: 0.7,
    inflationPct: 2.0,
  },
};

export interface CalculatorInputs {
  mode: Mode;
  currency: (typeof CURRENCIES)[number];
  riskPreset: RiskPreset;
  /** Desired monthly income (withdrawal) or target future capital (growth) */
  targetMonthlyIncome: number;
  targetFutureCapital: number;
  timeHorizonYears: number;
  startingCapital: number;
  expectedAnnualReturnPct: number;
  monthlyTopUp: number;
  inflationEnabled: boolean;
  inflationPct: number;
  cashBufferPct: number;
  cashAPY: number;
  reinvestmentSplitPct: number;
  withdrawalRule: WithdrawalRule;
  withdrawalPctOfCapital: number;
  yieldBoost: YieldBoost;
}

export interface MonthSnapshot {
  monthIndex: number;
  totalCapital: number;
  investedCapital: number;
  cashBalance: number;
  withdrawalPaid: number;
  realCapital?: number;
}

export interface SimulationResult {
  monthlySnapshots: MonthSnapshot[];
  /** Last 12 months of total capital for sparkline */
  last12MonthsCapital: number[];
  /** Current month outcome (payable this month in withdrawal mode) */
  currentOutcome: number;
  /** Monthly passive income from capital returns and cash management (buffer + invested) */
  passiveIncomeMonthly: number;
  /** Projected monthly income at horizon (growth mode) or N/A */
  projectedMonthlyIncomeAtHorizon: number;
  totalWithdrawalsPaid: number;
  totalContributions: number;
  nominalCapitalAtHorizon: number;
  realCapitalAtHorizon: number;
  /** Month index when capital hits 0 (null if never) */
  depletionMonth: number | null;
  /** Consecutive months buffer was breached (if any) */
  bufferBreachMonths: number;
  status: StatusKind;
  coveragePct: number;
  /** "Forever Income Achieved" or "Runs out in X years Y months" */
  runwayPhrase: string;
  /** Withdrawal mode: monthly return on capital = r×P (r = R/12). Single source of truth. */
  monthlyReturnOnCapital?: number;
  /** Withdrawal mode: W ≤ rP → sustainable (indefinite). */
  formulaSustainable?: boolean;
  /** Withdrawal mode: exact months to depletion (real); null if sustainable. */
  formulaDepletionMonthsExact?: number | null;
  /** Withdrawal mode: whole months of payouts (integer); null if sustainable. */
  formulaDepletionMonthsWhole?: number | null;
}
