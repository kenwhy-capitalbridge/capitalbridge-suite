import type { LionContext } from "./buildLionContext";
import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";
import { generateLionToneCopy } from "./lionCopyLibrary";

export type LionNarrative = {
  headline: string;
  personalised: string;
  why: string;
  capital: string;
  sustainability: string;
  guidance: string;
  whatIsHappening: string;
  whyItIsHappening: string;
  ifDoNothing: string;
};

function formatAmount(value?: number, currency?: string): string {
  return formatCurrencyDisplayNoDecimals(value, currency);
}

function formatYears(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "an open-ended period";
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 });
}

function vary(sentenceA: string, sentenceB: string) {
  return Math.random() > 0.5 ? sentenceA : sentenceB;
}

export function generateLionNarrative(ctx: LionContext): LionNarrative {
  const netMonthly = typeof ctx.netMonthly === "number" && Number.isFinite(ctx.netMonthly) ? ctx.netMonthly : 0;
  const sustainabilityYears =
    typeof ctx.sustainabilityYears === "number" && Number.isFinite(ctx.sustainabilityYears)
      ? ctx.sustainabilityYears
      : undefined;
  const lionScore = typeof ctx.lionScore === "number" && Number.isFinite(ctx.lionScore) ? ctx.lionScore : 0;
  const capitalGap = typeof ctx.capitalGap === "number" && Number.isFinite(ctx.capitalGap) ? ctx.capitalGap : 0;
  const tone = generateLionToneCopy(lionScore);
  const outcome =
    netMonthly < 0
      ? `a deficit of ${formatAmount(Math.abs(netMonthly), ctx.currency)}`
      : `a surplus of ${formatAmount(netMonthly, ctx.currency)}`;
  const personalised = vary(
    `You are generating ${formatAmount(ctx.monthlyIncome, ctx.currency)} against ${formatAmount(ctx.monthlyExpense, ctx.currency)}, resulting in ${outcome}.`,
    `Your current structure produces ${formatAmount(ctx.monthlyIncome, ctx.currency)} against ${formatAmount(ctx.monthlyExpense, ctx.currency)}, leaving ${outcome}.`,
  );
  const why =
    netMonthly < 0
      ? `This deficit exists because expenses are higher than income, so ${formatAmount(Math.abs(netMonthly), ctx.currency)} must be drawn from capital each month.`
      : `This surplus exists because income exceeds expenses, allowing capital to remain intact.`;
  const capital = `Total capital stands at ${formatAmount(ctx.totalCapital, ctx.currency)}${
    capitalGap > 0 ? `, with a gap of ${formatAmount(capitalGap, ctx.currency)} to target.` : `.`
  }`;
  const sustainability = `The system currently holds for approximately ${formatYears(sustainabilityYears)} years.`;
  const guidance = tone.guidance;
  const ifDoNothing = `If no changes are made, the current structure will ${
    sustainabilityYears != null && sustainabilityYears < 10
      ? "likely fail within the medium term."
      : "remain stable but vulnerable to shocks."
  }`;

  if (ctx.modelType === "FOREVER") {
    return {
      headline: tone.headline,
      personalised,
      why,
      capital,
      sustainability,
      guidance,
      whatIsHappening: `${personalised} ${capital}`,
      whyItIsHappening: `${sustainability} ${guidance}`,
      ifDoNothing,
    };
  }

  if (ctx.modelType === "HEALTH") {
    return {
      headline: tone.headline,
      personalised,
      why,
      capital,
      sustainability,
      guidance,
      whatIsHappening: `${personalised} ${sustainability}`,
      whyItIsHappening: `${capital} ${guidance}`,
      ifDoNothing,
    };
  }

  if (ctx.modelType === "STRESS") {
    return {
      headline: tone.headline,
      personalised,
      why,
      capital,
      sustainability,
      guidance,
      whatIsHappening: `${personalised} The depletion pressure currently reads ${ctx.depletionPressure ?? "unknown"}.`,
      whyItIsHappening: `${capital} ${sustainability} ${guidance}`,
      ifDoNothing,
    };
  }

  if (ctx.modelType === "IE") {
    return {
      headline: tone.headline,
      personalised,
      why,
      capital,
      sustainability,
      guidance,
      whatIsHappening: `${personalised} ${capital}`,
      whyItIsHappening: `${sustainability} ${guidance}`,
      ifDoNothing,
    };
  }

  return {
    headline: tone.headline,
    personalised,
    why,
    capital,
    sustainability,
    guidance,
    whatIsHappening: personalised,
    whyItIsHappening: `${capital} ${sustainability} ${guidance}`,
    ifDoNothing,
  };
}
