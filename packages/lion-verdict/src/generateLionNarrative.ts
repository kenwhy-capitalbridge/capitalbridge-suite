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
  const capitalGap = typeof ctx.capitalGap === "number" && Number.isFinite(ctx.capitalGap) ? ctx.capitalGap : 0;

  if (ctx.modelType === "FOREVER") {
    return {
      headline: `Your Forever structure is carrying ${formatAmount(ctx.monthlyExpense, ctx.currency)} of monthly dependency against ${formatAmount(ctx.monthlyIncome, ctx.currency)} of family offset.`,
      whatIsHappening:
        capitalGap > 0
          ? `You are still ${formatAmount(capitalGap, ctx.currency)} short of the capital base needed to hold this structure permanently, and the current runway is approximately ${formatYears(sustainabilityYears)} years.`
          : `You have built enough capital to support this structure with a runway of approximately ${formatYears(sustainabilityYears)} years, which puts the focus on durability rather than catch-up.`,
      whyItIsHappening: `Forever is driven by whether ${formatAmount(ctx.totalCapital, ctx.currency)} of assets can carry a required capital base of ${formatAmount(ctx.targetCapital, ctx.currency)} over the long horizon. The current pressure marker is ${ctx.depletionPressure ?? "unknown"} with a Lion score of ${lionScore}.`,
      ifDoNothing: `If no changes are made, the current structure will ${
        sustainabilityYears != null && sustainabilityYears < 10
          ? "likely fail within the medium term."
          : "remain stable but vulnerable to shocks."
      }`,
    };
  }

  if (ctx.modelType === "HEALTH") {
    return {
      headline: `Your Capital Health structure is producing ${formatAmount(ctx.monthlyIncome, ctx.currency)} toward a target income of ${formatAmount(ctx.monthlyExpense, ctx.currency)}.`,
      whatIsHappening:
        netMonthly < 0
          ? `There is an income gap of ${formatAmount(Math.abs(netMonthly), ctx.currency)} per month, and the current runway sits at approximately ${formatYears(sustainabilityYears)} years.`
          : `You are currently ahead of target by ${formatAmount(netMonthly, ctx.currency)} per month, with an estimated runway of approximately ${formatYears(sustainabilityYears)} years.`,
      whyItIsHappening: `Capital Health is responding to how reliably ${formatAmount(ctx.totalCapital, ctx.currency)} of capital can sustain the desired income path. The runway profile is being shaped by a ${ctx.depletionPressure ?? "unknown"} pressure state and a Lion score of ${lionScore}.`,
      ifDoNothing: `If no changes are made, the current structure will ${
        sustainabilityYears != null && sustainabilityYears < 10
          ? "likely fail within the medium term."
          : "remain stable but vulnerable to shocks."
      }`,
    };
  }

  if (ctx.modelType === "STRESS") {
    return {
      headline: `Your Capital Stress setup is absorbing ${formatAmount(ctx.monthlyExpense, ctx.currency)} of monthly withdrawal against a simulated support rate of ${formatAmount(ctx.monthlyIncome, ctx.currency)}.`,
      whatIsHappening: `The simulation is showing a ${ctx.depletionPressure ?? "unknown"} depletion profile, with the structure tracking for approximately ${formatYears(sustainabilityYears)} years under current assumptions.`,
      whyItIsHappening: `Stress outcomes are being driven by how ${formatAmount(ctx.totalCapital, ctx.currency)} performs against the required base of ${formatAmount(ctx.targetCapital, ctx.currency)}. The current simulation insight is a Lion score of ${lionScore}, which reflects how exposed the structure is to drawdowns and depletion pressure.`,
      ifDoNothing: `If no changes are made, the current structure will ${
        sustainabilityYears != null && sustainabilityYears < 10
          ? "likely fail within the medium term."
          : "remain stable but vulnerable to shocks."
      }`,
    };
  }

  if (ctx.modelType === "IE") {
    return {
      headline: `Your Income Engineering structure is balancing ${formatAmount(ctx.monthlyIncome, ctx.currency)} of monthly inflow against ${formatAmount(ctx.monthlyExpense, ctx.currency)} of monthly outflow.`,
      whatIsHappening:
        netMonthly < 0
          ? `There is an income-versus-expense mismatch of ${formatAmount(Math.abs(netMonthly), ctx.currency)} per month, which is putting pressure on the structure despite ${formatAmount(ctx.totalCapital, ctx.currency)} of available capital.`
          : `There is a positive monthly spread of ${formatAmount(netMonthly, ctx.currency)}, which means the income stack is currently outrunning expenses with ${formatAmount(ctx.totalCapital, ctx.currency)} available in reserve.`,
      whyItIsHappening: `Income Engineering is sensitive to the balance between recurring inflow, recurring outflow, and the capital reserve behind them. The current state reads ${ctx.depletionPressure ?? "unknown"} with a Lion score of ${lionScore}.${coverageRatio != null ? ` Coverage is running at ${(coverageRatio * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%.` : ""}`,
      ifDoNothing: `If no changes are made, the current structure will ${
        sustainabilityYears != null && sustainabilityYears < 10
          ? "likely fail within the medium term."
          : "remain stable but vulnerable to shocks."
      }`,
    };
  }

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
