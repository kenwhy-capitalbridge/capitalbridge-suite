/**
 * Capital Bridge Advisory Framework — shared copy for web + PDFs.
 * Keeps the “three steps” story consistent so reports read as one journey.
 */

export type AdvisoryReportStage =
  | "sustainability_forever"
  | "sustainability_income"
  | "capital_structure_health"
  | "risk_resilience_stress";

const JOURNEY =
  "The Capital Bridge Advisory Framework has three pillars — Evaluate Sustainability, Engineer Capital, and Stress Test Resilience. In plain terms: (1) Can your money last at the lifestyle you want? (2) Is your overall setup strong and balanced? (3) If markets fall or life changes, how might you cope?";

const STAGE: Record<
  AdvisoryReportStage,
  { youAreHere: string; focus: string; nextStepHint: string }
> = {
  sustainability_forever: {
    youAreHere: "Step 1 — Can your money last?",
    focus:
      "This report uses the Forever Income Model. It shows, using the numbers you entered, how long your savings and investments may support your spending. It is for learning and planning with a qualified adviser — not a product recommendation.",
    nextStepHint:
      "On the platform, Step 2 (Capital Health) and Step 3 (Capital Stress) add the next layers when you are ready.",
  },
  sustainability_income: {
    youAreHere: "Step 1 — Can your money last?",
    focus:
      "This report uses the Income Engineering Model. It checks whether your income, spending, and loans line up month to month. It is educational — not buy/sell investment advice.",
    nextStepHint:
      "When you are ready, Capital Health and Capital Stress on the platform continue the story in Steps 2 and 3.",
  },
  capital_structure_health: {
    youAreHere: "Step 2 — Is your setup strong enough?",
    focus:
      "This report uses the Capital Health Model. It looks at how withdrawals and growth interact over your chosen horizon. It works best after you have thought about Step 1 (sustainability) on the platform.",
    nextStepHint: "Step 3 (Capital Stress) then asks how the plan might behave under many possible market paths.",
  },
  risk_resilience_stress: {
    youAreHere: "Step 3 — What happens under stress?",
    focus:
      "This report uses the Capital Stress Model. It stress-tests your plan with many simulated market paths. Read it after Steps 1 and 2 so the conclusions sit in context.",
    nextStepHint:
      "If you have not already, run Step 1 (Forever or Income Engineering) and Step 2 (Capital Health) on the platform for the full picture.",
  },
};

export type AdvisoryFrameworkPdfIntro = {
  eyebrow: string;
  title: string;
  body: string;
  youAreHere: string;
};

/**
 * Intro block for PDFs and print views — plain language, APAC-friendly, minimal jargon.
 */
export function advisoryFrameworkPdfIntro(stage: AdvisoryReportStage): AdvisoryFrameworkPdfIntro {
  const s = STAGE[stage];
  return {
    eyebrow: "Capital Bridge advisory journey",
    title: "How to read this report",
    body: `${JOURNEY} ${s.focus} ${s.nextStepHint}`,
    youAreHere: s.youAreHere,
  };
}

/** Short line for tight headers (e.g. html print). */
export function advisoryFrameworkHeaderLine(stage: AdvisoryReportStage): string {
  const { youAreHere } = STAGE[stage];
  return `${youAreHere} · Capital Bridge`;
}
