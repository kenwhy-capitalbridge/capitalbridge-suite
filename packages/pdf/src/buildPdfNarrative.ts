export type PdfNarrativeContext = {
  modelType?: string;
  clientName?: string;
  lionScore?: number;
  depletionPressure?: string | number;
  netMonthly?: number;
  sustainabilityYears?: number;
  capitalGap?: number;
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
  return {
    cover: {
      title: ctx.modelType,
      client: ctx.clientName || "Client",
      date: new Date().toISOString(),
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
    },
    actions: decisions,
    lion: {
      headline: narrative.headline,
      guidance: narrative.guidance,
    },
  };
}
