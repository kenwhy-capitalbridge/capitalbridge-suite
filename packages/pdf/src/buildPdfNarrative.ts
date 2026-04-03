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
    bullets: string[];
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
};

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
      bullets: [
        typeof ctx.netMonthly === "number"
          ? ctx.netMonthly < 0
            ? `You are short RM ${Math.abs(ctx.netMonthly).toLocaleString()} monthly`
            : `You have RM ${ctx.netMonthly.toLocaleString()} surplus monthly`
          : narrative.personalised,
        `Your capital lasts about ${ctx.sustainabilityYears ?? "-"} years`,
        typeof ctx.capitalGap === "number"
          ? ctx.capitalGap > 0
            ? `You need RM ${ctx.capitalGap.toLocaleString()} more`
            : "Your capital is sufficient"
          : "Your capital position needs review",
      ],
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
  };
}
