import type { InvestmentBucket } from '../types/calculator';

/**
 * Fixed investment assumption categories for the calculator.
 * Used by InvestmentBucketsPanel and can be used by the store for initial buckets.
 */
export interface InvestmentCategoryConfig {
  id: string;
  title: string;
  microcopy: string;
  defaultReturnAnnual: number;
}

export const INVESTMENT_CATEGORIES: InvestmentCategoryConfig[] = [
  {
    id: 'capital_preservation',
    title: 'Capital Preservation',
    microcopy: 'Money Market Funds, Fixed Deposits or T‑Bills',
    defaultReturnAnnual: 3,
  },
  {
    id: 'retirement_savings',
    title: 'Retirement Savings',
    microcopy: 'EPF, PRS, CPF, SRS, 401(k), Super, Public or Private Pension Schemes, MPF, RMF, SSS',
    defaultReturnAnnual: 5.5,
  },
  {
    id: 'income',
    title: 'Income Assets',
    microcopy: 'Bonds, Dividend Equities or REITs, Private Credit',
    defaultReturnAnnual: 5.5,
  },
  {
    id: 'growth',
    title: 'Growth Assets',
    microcopy: 'Equity Index, Private Equity or Venture',
    defaultReturnAnnual: 7.5,
  },
  {
    id: 'alternative',
    title: 'Diversifiers & High-Risk',
    microcopy: 'Gold or Commodities, Crypto (High Risk)',
    defaultReturnAnnual: 6,
  },
];

/** Default investment buckets for store initial state. Use when investmentBuckets is empty or missing category ids. */
export function getDefaultInvestmentBuckets(): InvestmentBucket[] {
  return INVESTMENT_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.title,
    allocation: 0,
    expectedReturnAnnual: c.defaultReturnAnnual,
    includeInReinvest: true,
  }));
}
