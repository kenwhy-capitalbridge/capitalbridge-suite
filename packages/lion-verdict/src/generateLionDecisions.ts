import type { LionContext } from "./buildLionContext";
import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";
import { getLionTone } from "./lionCopyLibrary";

function formatDecisionAmount(value: number, currency?: string): string {
  return formatCurrencyDisplayNoDecimals(Math.abs(value), currency);
}

function vary(...sentences: string[]) {
  if (sentences.length === 0) return "";
  return sentences[Math.floor(Math.random() * sentences.length)];
}

export function generateLionDecisions(ctx: LionContext): string[] {
  const actions: string[] = [];
  const lionScore = typeof ctx.lionScore === "number" && Number.isFinite(ctx.lionScore) ? ctx.lionScore : 0;
  const tone = getLionTone(lionScore);

  if (typeof ctx.netMonthly === "number" && ctx.netMonthly < 0) {
    actions.push(
      vary(
        `Close the monthly shortfall of ${formatDecisionAmount(ctx.netMonthly, ctx.currency)} by either increasing income streams or reducing fixed outflows.`,
        `Eliminate the ${formatDecisionAmount(ctx.netMonthly, ctx.currency)} monthly deficit so ongoing spending no longer depends on capital drawdown.`,
        `Repair the ${formatDecisionAmount(ctx.netMonthly, ctx.currency)} monthly funding gap by lifting recurring income or cutting committed expenses.`,
      ),
    );
  }

  if (typeof ctx.capitalGap === "number" && ctx.capitalGap > 0) {
    actions.push(
      vary(
        `Build an additional ${formatDecisionAmount(ctx.capitalGap, ctx.currency)} in capital to fully secure long-term sustainability.`,
        `Add ${formatDecisionAmount(ctx.capitalGap, ctx.currency)} of capital so the reserve reaches the level required for full sustainability.`,
        `Close the ${formatDecisionAmount(ctx.capitalGap, ctx.currency)} capital gap so the structure is backed by the reserve it actually needs.`,
      ),
    );
  }

  if (tone === "NOT_SUSTAINABLE") {
    actions.push(
      vary(
        `Lion score ${lionScore} places the structure in the non-sustainable band, so major changes need to happen before the runway disappears.`,
        `At lion score ${lionScore}, the structure sits below the survival threshold and needs a full reset in income, spending, or capital.`,
      ),
    );
  } else if (tone === "AT_RISK") {
    actions.push(
      vary(
        `Lion score ${lionScore} places the structure in the at-risk band, so the next move is to stabilise the base before pressure compounds.`,
        `At lion score ${lionScore}, the structure is already under strain and needs decisive correction before capital erosion accelerates.`,
      ),
    );
  } else if (tone === "FRAGILE") {
    actions.push(
      vary(
        `Lion score ${lionScore} places the structure in the fragile band, so the next move is to widen the margin before small shocks become larger gaps.`,
        `At lion score ${lionScore}, the structure still holds, but it needs extra resilience before routine volatility turns into funding pressure.`,
      ),
    );
  } else if (tone === "STABLE") {
    actions.push(
      vary(
        `Lion score ${lionScore} places the structure in the stable band, so the next move is to deepen reserves while the base is still intact.`,
        `At lion score ${lionScore}, the structure is holding, and this is the moment to widen protection before conditions tighten.`,
      ),
    );
  } else {
    actions.push(
      vary(
        `Lion score ${lionScore} places the structure in the strong band, so the next move is to protect surplus and sharpen efficiency.`,
        `At lion score ${lionScore}, the structure has room to optimise from strength while preserving the existing buffer.`,
      ),
    );
  }

  return actions;
}
