import type { LionContext } from "./buildLionContext";

export type LionNarrative = {
  headline: string;
  gap: string;
  capital: string;
  sustainability: string;
  pressure: string;
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

  return {
    headline: `Your current structure supports ${formatAmount(ctx.monthlyIncome, ctx.currency)} income against ${formatAmount(ctx.monthlyExpense, ctx.currency)} spending.`,
    gap:
      netMonthly < 0
        ? `You are short by ${formatAmount(Math.abs(netMonthly), ctx.currency)} per month, which is being funded by capital.`
        : `You have a surplus of ${formatAmount(netMonthly, ctx.currency)} per month.`,
    capital: `You hold ${formatAmount(ctx.totalCapital, ctx.currency)} against a required ${formatAmount(ctx.targetCapital, ctx.currency)}.`,
    sustainability: `At current settings, your structure holds for approximately ${formatYears(ctx.sustainabilityYears)} years.`,
    pressure: `Current pressure level is ${ctx.depletionPressure ?? "unknown"}. Lion score is ${ctx.lionScore ?? 0}.`,
  };
}
