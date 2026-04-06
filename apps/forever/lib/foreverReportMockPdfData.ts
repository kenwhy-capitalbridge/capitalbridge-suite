import { computeForeverResults } from "@/legacy/foreverModel";
import type { ForeverModelInputs } from "@/legacy/foreverModel";
import { ExpenseType } from "@/legacy/types";
import {
  buildForeverIncomeModelReportFilename,
  CB_REPORT_MODEL_DISPLAY_NAME,
  formatForeverCoverGeneratedLabel,
  type ReportAuditMeta,
} from "@cb/shared/reportTraceability";

const MOCK_INPUTS: ForeverModelInputs = {
  expenseType: ExpenseType.MONTHLY,
  expense: 10_000,
  familyContribution: 3_000,
  expectedReturn: 7,
  inflationRate: 2,
  cash: 20_000,
  investments: 250_000,
  realEstate: 500_000,
  propertyLoanCost: 3.55,
  propertyTimeHorizon: 20,
};

function resultsToRecord(r: ReturnType<typeof computeForeverResults>): Record<string, unknown> {
  return {
    monthlyExpense: r.monthlyExpense,
    annualExpense: r.annualExpense,
    propertyMonthlyRepayment: r.propertyMonthlyRepayment,
    familyContribution: r.familyContribution,
    expectedReturn: r.expectedReturn,
    inflationRate: r.inflationRate,
    realReturnRate: r.realReturnRate,
    capitalNeeded: Number.isFinite(r.capitalNeeded) ? r.capitalNeeded : null,
    currentAssets: r.currentAssets,
    assetBreakdown: r.assetBreakdown,
    gap: r.gap,
    progressPercent: r.progressPercent,
    isSustainable: r.isSustainable,
    runway: r.runway,
  };
}

/**
 * Deterministic props for the DOM strategic report (Playwright PDF), no DB/auth.
 */
export function getForeverMockReportPdfProps(): {
  audit: ReportAuditMeta;
  preparedForName: string;
  isTrial: boolean;
  lion: { verdictTier: string; headlineText: string; guidanceText: string };
  calculator: { inputs: Record<string, unknown>; results: Record<string, unknown> };
} {
  const computed = computeForeverResults(MOCK_INPUTS);
  const createdAt = new Date("2026-04-06T02:44:00.000Z");
  const tz = "Asia/Kuala_Lumpur";

  const audit: ReportAuditMeta = {
    reportId: "CB-FOREVER-MOCKPDF01",
    versionLabel: "v1.0",
    filename: buildForeverIncomeModelReportFilename({
      planSlug: "forever-income",
      createdAt,
      timeZone: tz,
    }),
    generatedAt: createdAt,
    generatedAtLabel: formatForeverCoverGeneratedLabel(createdAt, tz),
    modelDisplayName: CB_REPORT_MODEL_DISPLAY_NAME.FOREVER,
  };

  const inputs: Record<string, unknown> = {
    currency: "RM",
    expenseType: MOCK_INPUTS.expenseType === ExpenseType.ANNUAL ? "ANNUAL" : "MONTHLY",
    expense: MOCK_INPUTS.expense,
    familyContribution: MOCK_INPUTS.familyContribution,
    expectedReturn: MOCK_INPUTS.expectedReturn,
    inflationRate: MOCK_INPUTS.inflationRate,
    cash: MOCK_INPUTS.cash,
    investments: MOCK_INPUTS.investments,
    realEstate: MOCK_INPUTS.realEstate,
    propertyLoanCost: MOCK_INPUTS.propertyLoanCost,
    propertyTimeHorizon: MOCK_INPUTS.propertyTimeHorizon,
  };

  return {
    audit,
    preparedForName: "mock.client@example.com",
    isTrial: false,
    lion: {
      verdictTier: "NOT_SUSTAINABLE",
      headlineText: "The lion is exposed. No support remains. Stability has ended.",
      guidanceText:
        "Existing structure has failed. Target outcomes cannot be achieved. Full adjustment is necessary.",
    },
    calculator: {
      inputs,
      results: resultsToRecord(computed),
    },
  };
}
