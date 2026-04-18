import type { PdfTocBlock } from "./PdfAdvisoryCoverPage";

/** Forever Income strategic PDF — single source for cover TOC (dashboard + mock). */
export const PDF_TOC_FOREVER_INCOME: readonly PdfTocBlock[] = [
  {
    title: "Section A — Opening",
    items: ["Trial: sustainability snapshot, or paid: The Lion’s Verdict"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Your Forever Income (in one view)",
      "Next 30 days: pick one lever",
      "Inputs that drive the outcome",
      "Capital stack & accessibility",
      "Runway curve (capital over time)",
      "Levers ranked",
      "Where to go next",
    ],
  },
  {
    title: "Section C — DEEPER ANALYSIS (Evidence & Sensitivity)",
    items: [
      "Assumptions & definitions",
      "Liquidity haircut analysis",
      "Sensitivity: return (±1%)",
      "Sensitivity: inflation (±1%)",
      "Methodology & scope",
    ],
  },
  { title: "Appendix & closing (full legal)" },
];

export const PDF_TOC_INCOME_ENGINEERING: readonly PdfTocBlock[] = [
  {
    title: "Section A — Opening",
    items: ["Where this report fits", "Lion’s Verdict"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Your inputs and assumptions",
      "Income, expenses, and capital unlocking",
      "Investment allocation",
      "Coverage and sustainability",
      "Areas to improve",
    ],
  },
  {
    title: "Section C — Deeper analysis",
    items: ["Sensitivity to assumptions", "How this model works"],
  },
  { title: "Appendix and next steps" },
];

export const PDF_TOC_CAPITAL_STRESS: readonly PdfTocBlock[] = [
  {
    title: "Section A — Opening",
    items: ["Advisory framework context", "Trial or paid: The Lion’s Verdict"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Executive summary and key metrics",
      "Capital trajectory",
      "Stress scenarios and adjustments",
      "Signals and recommended focus",
    ],
  },
  {
    title: "Section C — Deeper analysis",
    items: [
      "Regime-Based Monte Carlo context",
      "Scenario methodology",
      "Disclosures and Next Steps",
    ],
  },
];

/** Same hierarchy for react-pdf (Capital Health) — render as Text blocks in app. */
export const PDF_TOC_CAPITAL_HEALTH: readonly PdfTocBlock[] = [
  { title: "Cover", items: ["Title, mode, contents"] },
  { title: "Summary", items: ["Outcome · why · meaning"] },
  { title: "Inputs", items: ["Mode, horizon, capital, returns"] },
  { title: "Results", items: ["Structural headline"] },
  { title: "Chart", items: ["Projection & chart read"] },
  { title: "What this means", items: ["Interpretation"] },
  { title: "Sensitivity", items: ["Inflation / runway"] },
  { title: "Optimisation", items: ["Improve outcome"] },
  { title: "Stress test", items: ["Scenarios"] },
  { title: "Lion's Verdict", items: ["Narrative"] },
  { title: "Next steps", items: ["Actions"] },
  { title: "Disclosure", items: ["Use of report"] },
];
