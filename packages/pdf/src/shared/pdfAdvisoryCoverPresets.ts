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
    items: ["Advisory framework context", "Trial or paid: The Lion’s Verdict"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Model inputs and expectations",
      "Income, expenses, and unlocking capital",
      "Investment allocation",
      "Coverage and sustainability charts",
      "Optimisation themes",
    ],
  },
  {
    title: "Section C — Deeper analysis",
    items: ["Assumption sensitivity", "Methodology notes"],
  },
  { title: "Appendix & closing" },
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
    items: ["Monte Carlo context", "Scenario methodology"],
  },
  { title: "Appendix & closing" },
];

/** Same hierarchy for react-pdf (Capital Health) — render as Text blocks in app. */
export const PDF_TOC_CAPITAL_HEALTH: readonly PdfTocBlock[] = [
  {
    title: "Section A — Opening",
    items: ["Advisory framework context", "Executive summary"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Capital structure diagnosis",
      "Structural confidence",
      "Capital health summary",
      "Charts and drivers",
    ],
  },
  {
    title: "Section C — Deeper analysis",
    items: ["Assumptions", "Scenario context"],
  },
  { title: "Appendix & closing" },
];
