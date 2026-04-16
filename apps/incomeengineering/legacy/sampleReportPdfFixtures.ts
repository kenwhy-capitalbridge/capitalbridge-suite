/**
 * Deterministic calculator state for `/docs/sample-report` (Playwright PDF, design-review samples).
 * Keep in sync with docs pipeline expectations.
 *
 * `SAMPLE_INCOME_ENGINEERING_PRINT_SNAPSHOT` is the full `IncomePrintSnapshotV1` used by `/docs/ie-sample-print`
 * (Playwright capture: mounts `#print-report` + `.cb-report-root` immediately).
 */

import { getDefaultInvestmentBuckets } from "./config/investmentCategories";
import type { CurrencyCode } from "./config/currency";
import type { AssetUnlock, IncomeRow } from "./types/calculator";
import { assetUnlocksToLoans } from "./lib/assetUnlockToLoans";
import { runSimulation } from "./lib/simulation";
import { serializeIncomePrintProps, type IncomePrintSnapshotV1 } from "./incomePrintSnapshot";

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

function buildSampleIncomePrintSnapshot(): IncomePrintSnapshotV1 {
  const assetUnlocks: AssetUnlock[] = [];
  const loans = assetUnlocksToLoans(assetUnlocks);
  const result = runSimulation({
    currency,
    monthlyExpenses,
    incomeRows,
    loans,
    investmentBuckets,
    assetUnlocks,
  });
  const totalCapital =
    (result.summary.totalUnlockedLiquidity ?? 0) +
    investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);

  return serializeIncomePrintProps({
    summary: result.summary,
    currency,
    totalCapital,
    monthlyExpenses,
    incomeRows,
    loans,
    assetUnlocks,
    investmentBuckets,
    medianCoverage: result.medianCoverage,
    worstMonthCoverage: result.worstMonthCoverage,
    lionAccessEnabled: true,
    reportClientDisplayName: "Sample Client",
    hasStrategicInterest: false,
  });
}

/** Full print snapshot for `/docs/ie-sample-print` (matches `SAMPLE_INCOME_ENGINEERING_HYDRATE` math). */
export const SAMPLE_INCOME_ENGINEERING_PRINT_SNAPSHOT: IncomePrintSnapshotV1 = buildSampleIncomePrintSnapshot();
