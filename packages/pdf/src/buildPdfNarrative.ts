import { buildReportId } from "@cb/shared/reportTraceability";
import { generateLionCritical } from "@cb/lion-verdict";

export type PdfNarrativeContext = {
  modelType?: string;
  clientName?: string;
  lionScore?: number;
  depletionPressure?: string | number;
  netMonthly?: number;
  sustainabilityYears?: number;
  capitalGap?: number;
  capitalProgressPct?: number;
};

export type PdfNarrativeInput = {
  headline: string;
  personalised: string;
  why: string;
  guidance: string;
};

export type PdfNarrativeOutput = {
  cover: {
    title: string | undefined;
    client: string;
    date: string;
    reportId: string;
    frameworkNote: string;
  };
  coverMetrics: {
    capitalProgressPct?: number;
    sustainabilityYears?: number;
    monthlyGapOrSurplus?: number;
    plainEnglishSummary: string[];
  };
  access?: {
    isTrial?: boolean;
    isPaid?: boolean;
  };
  summary: {
    headline: string;
    keyPoint: string;
    statusLabel: string;
    progressPct?: number;
    monthlySpend?: number;
    monthlyIncome?: number;
    monthlyGapOrSurplus?: number;
    sustainabilityYears?: number;
    meaning?: string;
    blocks: Array<{
      title: string;
      body: string;
    }>;
  };
  diagnosis: {
    what: string;
    why: string;
    state: string;
    critical?: string;
  };
  actions: string[];
  nextStep: {
    headline: string;
    body: string;
    closing: string;
  };
  lion: {
    headline: string;
    guidance: string;
  };
  journey: {
    completedStepLabel: string;
    nextStepLabel: string;
    nextStepSummary: string;
    steps: Array<{
      title: string;
      whatItDoes: string;
      whyItMatters: string;
      isCurrent?: boolean;
      isNext?: boolean;
    }>;
  };
  analysis: {
    inputSummary: string[];
    assumptions: string[];
    outputMetrics: string[];
    capitalBreakdown: string[];
    sustainabilityAnalysis: string[];
    chartInsights: Array<{
      title: string;
      metric: string;
      xAxisLabel: string;
      yAxisLabel: string;
      whatThisShows: string;
      whyThisMatters: string;
      interpretationNote: string;
    }>;
  };
};

const ADVISORY_JOURNEY = [
  {
    key: "FOREVER",
    title: "Forever Income",
    whatItDoes: "Tests how long your current capital can support your lifestyle.",
    whyItMatters: "It gives you the baseline sustainability answer before any deeper structuring work.",
  },
  {
    key: "INCOME",
    title: "Income Engineering",
    whatItDoes: "Aligns income streams, obligations, and recurring cash flow.",
    whyItMatters: "It shows whether your monthly structure is helping or weakening sustainability.",
  },
  {
    key: "HEALTH",
    title: "Capital Health",
    whatItDoes: "Measures the strength and balance of the capital base behind the plan.",
    whyItMatters: "It highlights whether the capital pool is strong enough to carry long-term goals.",
  },
  {
    key: "STRESS",
    title: "Capital Stress",
    whatItDoes: "Tests the structure under weaker markets and tougher conditions.",
    whyItMatters: "It shows how resilient the plan remains when reality does not go smoothly.",
  },
] as const;

export function buildPdfNarrative(
  ctx: PdfNarrativeContext,
  narrative: PdfNarrativeInput,
  decisions: string[],
): PdfNarrativeOutput {
  const fragileOrDeficit =
    (typeof ctx.netMonthly === "number" && ctx.netMonthly < 0) ||
    (typeof ctx.lionScore === "number" && ctx.lionScore < 70);
  const capitalProgressPct =
    typeof ctx.capitalProgressPct === "number" && Number.isFinite(ctx.capitalProgressPct)
      ? Math.max(0, Math.min(100, ctx.capitalProgressPct))
      : typeof ctx.lionScore === "number" && Number.isFinite(ctx.lionScore)
        ? Math.max(0, Math.min(100, ctx.lionScore))
        : undefined;
  const generatedAt = new Date();
  const reportId = buildReportId(
    (ctx.modelType as "STRESS" | "INCOME" | "HEALTH" | "FOREVER") ?? "INCOME",
    `${ctx.clientName ?? "Client"}|${generatedAt.toISOString()}|${narrative.headline}`,
  );
  const journeyModelKey =
    ctx.modelType === "IE"
      ? "INCOME"
      : ctx.modelType === "HEALTH" || ctx.modelType === "STRESS" || ctx.modelType === "FOREVER"
        ? ctx.modelType
        : "INCOME";
  const currentStepIndex = ADVISORY_JOURNEY.findIndex((step) => step.key === journeyModelKey);
  const safeCurrentStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const nextStep =
    ADVISORY_JOURNEY[Math.min(safeCurrentStepIndex + 1, ADVISORY_JOURNEY.length - 1)];
  const currentStep = ADVISORY_JOURNEY[safeCurrentStepIndex];
  const summaryLines = [
    typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
      ? `Your current capital supports your lifestyle for ${ctx.sustainabilityYears.toFixed(1)} years.`
      : "Your current structure needs a capital sustainability review.",
    typeof capitalProgressPct === "number"
      ? capitalProgressPct >= 100
        ? "You have already reached the capital level required for long-term sustainability."
        : `You are ${Math.max(0, 100 - capitalProgressPct).toFixed(0)}% away from long-term sustainability.`
      : "Your long-term sustainability position still needs to be quantified.",
    typeof ctx.netMonthly === "number"
      ? ctx.netMonthly < 0
        ? `Adjustments are required to close the monthly gap of RM ${Math.abs(ctx.netMonthly).toLocaleString()}.`
        : `You are currently running a monthly surplus of RM ${ctx.netMonthly.toLocaleString()}.`
      : "Adjustments may still be required to stabilise your position.",
  ];
  const currency = "RM";
  const monthlyIncome =
    typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly) && ctx.netMonthly >= 0
      ? ctx.netMonthly
      : 0;
  const monthlySpend =
    typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly)
      ? Math.abs(ctx.netMonthly) + monthlyIncome
      : undefined;
  const yearlyWithdrawal =
    typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly)
      ? Math.abs(ctx.netMonthly) * 12
      : undefined;
  const statusLabel =
    typeof ctx.lionScore === "number" && Number.isFinite(ctx.lionScore)
      ? ctx.lionScore >= 85
        ? "Strong"
        : ctx.lionScore >= 70
          ? "Stable"
          : ctx.lionScore >= 55
            ? "Fragile"
            : "At Risk"
      : fragileOrDeficit
        ? "Fragile"
        : "Stable";
  const meaning =
    typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly)
      ? ctx.netMonthly < 0
        ? "Your current setup is draining capital each month, so the plan needs changes to hold up for longer."
        : "Your current setup is still covering itself, but it should be tuned so the position stays durable over time."
      : "Your current setup needs a clearer monthly picture before the long-term outlook can be trusted.";
  const summaryBlocks = [
    {
      title: "Your Position",
      body:
        typeof monthlySpend === "number"
          ? `You are currently spending ${currency} ${monthlySpend.toLocaleString()} and generating ${currency} ${monthlyIncome.toLocaleString()}.`
          : "Your current monthly position is still being calculated.",
    },
    {
      title: "Your Gap",
      body:
        typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly)
          ? ctx.netMonthly < 0
            ? `You are short ${currency} ${Math.abs(ctx.netMonthly).toLocaleString()} per month.`
            : `You have ${currency} ${ctx.netMonthly.toLocaleString()} surplus each month.`
          : "Your monthly gap still needs review.",
    },
    {
      title: "Your Timeline",
      body:
        typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
          ? `Your capital lasts approximately ${ctx.sustainabilityYears.toFixed(1)} years.`
          : "Your capital timeline still needs review.",
    },
    {
      title: "What This Means",
      body: meaning,
    },
  ];
  const outputMetrics = [
    typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly)
      ? ctx.netMonthly < 0
        ? `Monthly shortfall: ${currency} ${Math.abs(ctx.netMonthly).toLocaleString()}`
        : `Monthly surplus: ${currency} ${ctx.netMonthly.toLocaleString()}`
      : "Monthly position: under review",
    typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
      ? `Sustainability horizon: ${ctx.sustainabilityYears.toFixed(1)} years`
      : "Sustainability horizon: under review",
    typeof capitalProgressPct === "number"
      ? `Progress toward target: ${capitalProgressPct.toFixed(0)}%`
      : "Progress toward target: under review",
  ];
  const chartInsights = [
    {
      title: "Capital trajectory",
      metric: outputMetrics[1],
      xAxisLabel: "X Axis: Years",
      yAxisLabel: "Y Axis: RM",
      whatThisShows:
        "What this shows: the expected path of capital strength across the planning horizon.",
      whyThisMatters:
        "Why this matters: it shows whether the current structure is improving, holding, or weakening over time.",
      interpretationNote:
        "Interpretation note: focus on the direction and durability of the path rather than the exact internal calculation.",
    },
    {
      title: "Monthly funding position",
      metric: outputMetrics[0],
      xAxisLabel: "X Axis: Time",
      yAxisLabel: "Y Axis: RM / month",
      whatThisShows:
        "What this shows: whether recurring cash needs are supported by recurring cash sources or by capital drawdown.",
      whyThisMatters:
        "Why this matters: recurring pressure is often the clearest signal of long-term strain.",
      interpretationNote:
        "Interpretation note: this explains behaviour in the structure, not the formula behind it.",
    },
  ];

  return {
    cover: {
      title: ctx.modelType,
      client: ctx.clientName || "Client",
      date: generatedAt.toISOString(),
      reportId,
      frameworkNote: "Prepared using Capital Bridge™ advisory framework",
    },
    coverMetrics: {
      capitalProgressPct,
      sustainabilityYears: ctx.sustainabilityYears,
      monthlyGapOrSurplus: ctx.netMonthly,
      plainEnglishSummary: summaryLines,
    },
    access: {
      isTrial: false,
      isPaid: true,
    },
    summary: {
      headline: narrative.headline,
      keyPoint: narrative.personalised,
      statusLabel,
      progressPct: capitalProgressPct,
      monthlySpend,
      monthlyIncome,
      monthlyGapOrSurplus: ctx.netMonthly,
      sustainabilityYears: ctx.sustainabilityYears,
      meaning,
      blocks: summaryBlocks,
    },
    diagnosis: {
      what: narrative.personalised,
      why: narrative.why,
      state: `Lion Score: ${ctx.lionScore} · ${ctx.depletionPressure}`,
      critical: generateLionCritical(ctx),
    },
    actions: decisions,
    nextStep: fragileOrDeficit
      ? {
          headline: "WHAT HAPPENS NEXT",
          body:
            "You are exposed to structural risk. Review your capital, income, and obligations next. Identify where safe adjustments can be made.",
          closing:
            "You can continue on your own. Or work with Capital Bridge™ to structure and execute this properly.",
        }
      : {
          headline: "WHAT HAPPENS NEXT",
          body:
            "Your structure is holding. It is not fully optimised. Review how your existing capital can be positioned more efficiently without increasing risk.",
          closing:
            "You can continue on your own. Or work with Capital Bridge™ to structure and execute this properly.",
        },
    lion: {
      headline: narrative.headline,
      guidance: narrative.guidance,
    },
    journey: {
      completedStepLabel: `You have completed Step ${safeCurrentStepIndex + 1}.`,
      nextStepLabel:
        safeCurrentStepIndex < ADVISORY_JOURNEY.length - 1
          ? `Next: ${nextStep.title}`
          : "You have completed the full advisory journey.",
      nextStepSummary:
        safeCurrentStepIndex < ADVISORY_JOURNEY.length - 1
          ? `${nextStep.title} — ${nextStep.whatItDoes.replace(/\.$/, "").toLowerCase()}.`
          : `${currentStep.title} completes the four-step Capital Bridge advisory flow.`,
      steps: ADVISORY_JOURNEY.map((step, index) => ({
        title: step.title,
        whatItDoes: step.whatItDoes,
        whyItMatters: step.whyItMatters,
        isCurrent: index === safeCurrentStepIndex,
        isNext: index === safeCurrentStepIndex + 1,
      })),
    },
    analysis: {
      inputSummary: [
        typeof monthlySpend === "number"
          ? `Current monthly spending considered in this review: ${currency} ${monthlySpend.toLocaleString()}.`
          : "Current monthly spending is still being reviewed.",
        typeof monthlyIncome === "number"
          ? `Recurring monthly cash generation considered: ${currency} ${monthlyIncome.toLocaleString()}.`
          : "Recurring monthly cash generation is still being reviewed.",
      ],
      assumptions: [
        "This analysis reflects the current structure, time horizon, and advisory assumptions captured for the report.",
        "Outputs are directional and planning-focused, designed to support decisions rather than disclose internal model mechanics.",
      ],
      outputMetrics,
      capitalBreakdown: [
        typeof ctx.capitalGap === "number" && Number.isFinite(ctx.capitalGap)
          ? ctx.capitalGap > 0
            ? `Additional capital required for full sustainability: ${currency} ${ctx.capitalGap.toLocaleString()}.`
            : "Current capital already meets the sustainability threshold used for this review."
          : "Capital threshold assessment is still under review.",
        typeof capitalProgressPct === "number"
          ? `Current progress toward the target capital level: ${capitalProgressPct.toFixed(0)}%.`
          : "Target capital progress is still under review.",
      ],
      sustainabilityAnalysis: [
        typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
          ? `At the current structure, capital is expected to support the position for about ${ctx.sustainabilityYears.toFixed(1)} years.`
          : "The expected capital duration is still under review.",
        meaning,
      ],
      chartInsights,
    },
  };
}
