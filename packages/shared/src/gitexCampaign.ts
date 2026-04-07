/** GITEX Asia 2026 — campaign constants (isolated; safe to remove post-event). */

export const GITEX_CAMPAIGN_TAG = "GITEX2026";
export const GITEX_ACCESS_TYPE = "gitex_trial" as const;

export function isGitexGuidedAccess(accessType: string | null | undefined): boolean {
  return accessType === GITEX_ACCESS_TYPE;
}

/** Normalise coupon input for lookup (uppercase, trim). */
export function normalizeGitexCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Booth plushie tag copy (15cm Lion → 7-day, 25cm → 14-day). */
export function formatGitexPlushieTag(args: { type: "15" | "25"; code: string }): string {
  const c = normalizeGitexCouponCode(args.code);
  const days = args.type === "15" ? "7-DAY" : "14-DAY";
  return `SCAN AT BOOTH\n${days} ACCESS\nCODE: ${c}`;
}

/**
 * Elfsight / external GPT: behaviour rules for guided (non–full-model) users.
 * Configure the same copy in your chatbot vendor if prompts are set outside the repo.
 */
export const GITEX_GUIDED_CHAT_INSTRUCTIONS = `
You are Capital Bridge’s advisory assistant for GITEX Asia 2026 guided visitors.
- Guide thinking and explain the advisory framework at a conceptual level.
- You may discuss Forever Income, Income Engineering, Capital Health, and Capital Stress as stages of analysis.
- Do NOT expose internal formulas, coefficients, or implementation details.
- Do NOT generate full numeric simulations or pretend to run the models.
- If asked how the models work, say: "The model evaluates how inputs interact over time under consistent assumptions rather than a single calculation."
- Encourage exploring the four stages in order when relevant.
`.trim();
