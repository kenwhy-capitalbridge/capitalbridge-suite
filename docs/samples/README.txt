Sample outputs for design / stakeholder review (not fixtures for automated tests).

Regenerate all four PDFs (Puppeteer downloads Chromium on npm install):

  npm run docs:sample-pdfs

Individual generators:

  npm run docs:sample-pdf-capital-health
  npx tsx apps/forever/scripts/render-sample-pdf-for-docs.ts
  npx tsx apps/capitalstress/scripts/render-sample-pdf-for-docs.ts
  npx tsx apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts

Files:

  capital-health-report.pdf — Capital Health (react-pdf + buildCalculatorResults)
  forever-income-report.pdf — Forever Income (jsPDF, legacy/foreverPdfBuild)
  capital-stress-report.pdf — Capital Stress print layout (PrintReport + Puppeteer)
  income-engineering-report.pdf — Income Engineering print layout (PrintReportView + Puppeteer)

Default scenarios are documented in each script (representative inputs for review).
