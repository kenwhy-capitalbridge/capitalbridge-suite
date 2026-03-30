"use client";

import App from "@/legacy/App";
import { SAMPLE_INCOME_ENGINEERING_HYDRATE } from "@/legacy/sampleReportPdfFixtures";
import type { LionAccessUser } from "../../../../../packages/lion-verdict/access";

const lionAccessUser: LionAccessUser = { isPaid: true, hasActiveTrialUpgrade: false };

/**
 * Public (no /dashboard auth) fixture URL for sample PDFs — real App + store hydration, not static HTML.
 * Playwright: `page.goto(origin + '/docs/sample-report')` while `next dev` is running.
 */
export default function IncomeEngineeringSampleReportPage() {
  return (
    <App
      initialHydratePayload={SAMPLE_INCOME_ENGINEERING_HYDRATE}
      lionAccessUser={lionAccessUser}
      reportClientDisplayName="Sample Client"
    />
  );
}
