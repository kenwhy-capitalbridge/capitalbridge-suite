/**
 * Deterministic calculator state for `/docs/sample-report` (Playwright PDF, design-review samples).
 * Keep in sync with docs pipeline expectations.
 */

import { getDefaultInvestmentBuckets } from "./config/investmentCategories";
import type { CurrencyCode } from "./config/currency";
import type { IncomeRow } from "./types/calculator";

const currency: CurrencyCode = "RM";
const monthlyExpenses = 8_000;
const incomeRows: IncomeRow[] = [
  { id: "inc-1", label: "Salary / Wages", amount: 12_000 },
  { id: "inc-2", label: "Rental Income", amount: 0 },
  { id: "inc-3", label: "Family Contribution", amount: 0 },
  { id: "inc-4", label: "Other Recurring Income", amount: 0 },
];

const allocations = [200_000, 150_000, 180_000, 250_000, 50_000];
const investmentBuckets = getDefaultInvestmentBuckets().map((b, i) => ({
  ...b,
  allocation: allocations[i] ?? 0,
}));

/** Partial snapshot merged into calculator initial state via `HYDRATE` rules. */
export const SAMPLE_INCOME_ENGINEERING_HYDRATE = {
  currency,
  monthlyExpenses,
  incomeRows,
  loans: [],
  assetUnlocks: [],
  investmentBuckets,
};
