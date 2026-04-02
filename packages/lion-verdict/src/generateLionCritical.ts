import type { LionContext } from "./buildLionContext";

export function generateLionCritical(ctx: LionContext): string | undefined {
  if (typeof ctx.lionScore === "number" && ctx.lionScore >= 90 && ctx.lionScore < 100) {
    return "This is strong, but not yet complete. There is still room to improve resilience.";
  }

  return undefined;
}
