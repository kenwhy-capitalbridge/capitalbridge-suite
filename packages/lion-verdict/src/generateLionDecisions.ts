import type { LionContext } from "./buildLionContext";

function formatDecisionAmount(value: number, currency?: string): string {
  const currencyLabel = currency ?? "RM";
  return `${currencyLabel} ${Math.abs(value).toLocaleString()}`;
}

export function generateLionDecisions(ctx: LionContext): string[] {
  const actions: string[] = [];

  if (typeof ctx.netMonthly === "number" && ctx.netMonthly < 0) {
    actions.push(
      `Reduce monthly deficit of ${formatDecisionAmount(ctx.netMonthly, ctx.currency)} by increasing income or reducing expenses.`,
    );
  }

  if (typeof ctx.capitalGap === "number" && ctx.capitalGap > 0) {
    actions.push(
      `Bridge capital gap of ${formatDecisionAmount(ctx.capitalGap, ctx.currency)} to reach sustainability target.`,
    );
  }

  if (typeof ctx.lionScore === "number" && ctx.lionScore < 50) {
    actions.push(`Immediate restructuring required. Current system is not sustainable.`);
  }

  if (typeof ctx.lionScore === "number" && ctx.lionScore >= 50 && ctx.lionScore < 75) {
    actions.push(`System is fragile. Reinforcement is recommended before stress events occur.`);
  }

  if (typeof ctx.lionScore === "number" && ctx.lionScore >= 75) {
    actions.push(`System is stable. Focus on optimisation and protection.`);
  }

  return actions;
}
