export type PdfNarrativeContext = {
  modelType?: string;
  clientName?: string;
  lionScore?: number;
  depletionPressure?: string | number;
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
  };
  diagnosis: {
    what: string;
    why: string;
    state: string;
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
