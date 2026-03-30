Sample outputs for design / stakeholder review (not fixtures for automated tests).

Regenerate all four PDFs (HTML → PDF via Playwright Chromium). First time / CI: `npm run docs:playwright-browsers` (or `npx playwright install chromium`).

  npm run docs:sample-pdfs

Individual generators:

  npm run docs:sample-pdf-capital-health
  npx tsx apps/forever/scripts/render-sample-pdf-for-docs.ts
  npx tsx apps/capitalstress/scripts/render-sample-pdf-for-docs.ts
  npx tsx apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts

Files:

  capital-health-report.pdf — Capital Health (react-pdf + buildCalculatorResults)
  forever-income-report.pdf — Forever Income (jsPDF, legacy/foreverPdfBuild)
  capital-stress-report.pdf — Capital Stress print layout (PrintReport + Playwright)
  income-engineering-report.pdf — Income Engineering print layout (PrintReportView + Playwright)

Default scenarios are documented in each script (representative inputs for review).
