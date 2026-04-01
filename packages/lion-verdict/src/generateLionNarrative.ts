import type { LionContext } from "./buildLionContext";

export type LionNarrative = {
  headline: string;
  whatIsHappening: string;
  whyItIsHappening: string;
  ifDoNothing: string;
};

function formatAmount(value?: number, currency?: string): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const currencyLabel = currency ?? "RM";
  return `${currencyLabel} ${safeValue.toLocaleString()}`;
}

function formatYears(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "an open-ended period";
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 });
}

export function generateLionNarrative(ctx: LionContext): LionNarrative {
  const netMonthly = typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly) ? ctx.netMonthly : 0;
  const sustainabilityYears =
    typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
      ? ctx.sustainabilityYears
      : undefined;
  const lionScore = typeof ctx.lionScore === "number" && Number.isFinite(ctx.lionScore) ? ctx.lionScore : 0;
  const coverageRatio =
    typeof ctx.coverageRatio === "number" && Number.isFinite(ctx.coverageRatio) ? ctx.coverageRatio : undefined;

  return {
    headline: `Your current structure supports ${formatAmount(ctx.monthlyIncome, ctx.currency)} income against ${formatAmount(ctx.monthlyExpense, ctx.currency)} spending.`,
    whatIsHappening:
      netMonthly < 0
        ? `You are short by ${formatAmount(Math.abs(netMonthly), ctx.currency)} per month, and the structure is leaning on ${formatAmount(ctx.totalCapital, ctx.currency)} of capital to absorb that drag. At current settings, it holds for approximately ${formatYears(sustainabilityYears)} years.`
        : `You are generating a monthly surplus of ${formatAmount(netMonthly, ctx.currency)}, supported by ${formatAmount(ctx.totalCapital, ctx.currency)} of capital. At current settings, the structure holds for approximately ${formatYears(sustainabilityYears)} years.`,
    whyItIsHappening: `This is happening because available capital of ${formatAmount(ctx.totalCapital, ctx.currency)} is being measured against a sustainability requirement of ${formatAmount(ctx.targetCapital, ctx.currency)}, with pressure currently reading ${ctx.depletionPressure ?? "unknown"} and a Lion score of ${lionScore}.${
      coverageRatio != null ? ` Coverage is tracking at ${(coverageRatio * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%.` : ""
    }`,
    ifDoNothing: `If no changes are made, the current structure will ${
      sustainabilityYears != null && sustainabilityYears < 10
        ? "likely fail within the medium term."
        : "remain stable but vulnerable to shocks."
    }`,
  };
}
