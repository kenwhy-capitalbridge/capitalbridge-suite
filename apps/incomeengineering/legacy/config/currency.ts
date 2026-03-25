/**
 * Currency configuration: display symbol, hard maximums, and default values.
 * No FX conversion; currency is for display and validation only.
 */

export type CurrencyCode = 'RM' | 'SGD' | 'USD' | 'AUD' | 'RMB' | 'HKD' | 'THB' | 'PHP';

export interface CurrencyConfig {
  code: CurrencyCode;
  label: string;
  /** Max monthly expenses (single month) */
  maxMonthlyExpenses: number;
  /** Max total investments / portfolio */
  maxInvestmentTotal: number;
  /** Default monthly expenses when this currency is selected */
  defaultMonthlyExpenses: number;
  /** Default total investment pool when this currency is selected */
  defaultInvestmentPool: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  RM: {
    code: 'RM',
    label: 'RM (MYR)',
    maxMonthlyExpenses: 250_000,
    maxInvestmentTotal: 5_000_000,
    defaultMonthlyExpenses: 15_000,
    defaultInvestmentPool: 500_000,
  },
  SGD: {
    code: 'SGD',
    label: 'SGD',
    maxMonthlyExpenses: 250_000,
    maxInvestmentTotal: 5_000_000,
    defaultMonthlyExpenses: 10_000,
    defaultInvestmentPool: 500_000,
  },
  USD: {
    code: 'USD',
    label: 'USD',
    maxMonthlyExpenses: 250_000,
    maxInvestmentTotal: 5_000_000,
    defaultMonthlyExpenses: 8_000,
    defaultInvestmentPool: 500_000,
  },
  AUD: {
    code: 'AUD',
    label: 'AUD',
    maxMonthlyExpenses: 250_000,
    maxInvestmentTotal: 5_000_000,
    defaultMonthlyExpenses: 8_000,
    defaultInvestmentPool: 500_000,
  },
  RMB: {
    code: 'RMB',
    label: 'RMB',
    maxMonthlyExpenses: 800_000,
    maxInvestmentTotal: 30_000_000,
    defaultMonthlyExpenses: 25_000,
    defaultInvestmentPool: 2_000_000,
  },
  HKD: {
    code: 'HKD',
    label: 'HKD',
    maxMonthlyExpenses: 800_000,
    maxInvestmentTotal: 30_000_000,
    defaultMonthlyExpenses: 25_000,
    defaultInvestmentPool: 2_000_000,
  },
  THB: {
    code: 'THB',
    label: 'THB',
    maxMonthlyExpenses: 2_500_000,
    maxInvestmentTotal: 5_000_000,
    defaultMonthlyExpenses: 12_000,
    defaultInvestmentPool: 500_000,
  },
  PHP: {
    code: 'PHP',
    label: 'PHP',
    maxMonthlyExpenses: 4_000_000,
    maxInvestmentTotal: 60_000_000,
    defaultMonthlyExpenses: 12_000,
    defaultInvestmentPool: 2_000_000,
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'RM';

export const CURRENCY_LIST: CurrencyCode[] = ['RM', 'SGD', 'USD', 'AUD', 'RMB', 'HKD', 'THB', 'PHP'];
