// =============================================
// LION TIER PRESENTATION LAYER (EXPRESSION ONLY)
// =============================================

import type { LionVerdict } from "./verdict";

export type LionTier = "TRIAL" | "PAID" | "STRATEGIC";

export type LionTierOutput = {
  lion_status: LionVerdict["lion_status"];
  headline: string;
  core: {
    what_is_happening?: string;
    what_will_happen?: string;
    what_must_be_done: string;
  };
  guidance?: string[];
  actions: string[];
  meta?: LionVerdict["meta"];
};

const TIER_CONFIG = {
  TRIAL: {
    show_what_is_happening: true,
    show_what_will_happen: false,
    guidance_limit: 1,
    action_limit: 1,
    include_meta: false,
  },
  PAID: {
    show_what_is_happening: true,
    show_what_will_happen: true,
    guidance_limit: 3,
    action_limit: 3,
    include_meta: false,
  },
  STRATEGIC: {
    show_what_is_happening: true,
    show_what_will_happen: true,
    guidance_limit: Infinity,
    action_limit: Infinity,
    include_meta: true,
  },
} as const;

function enforceCriticalFields(verdict: LionVerdict): void {
  if (!verdict.core.what_must_be_done) {
    throw new Error("Lion invariant violated: missing what_must_be_done");
  }

  if (!verdict.lion_status) {
    throw new Error("Lion invariant violated: missing lion_status");
  }
}

function sliceArray<T>(arr: T[], limit: number): T[] {
  if (limit === Infinity) return arr;
  return arr.slice(0, limit);
}

export function applyLionTier(
  verdict: LionVerdict,
  tier: LionTier
): LionTierOutput {
  enforceCriticalFields(verdict);

  const config = TIER_CONFIG[tier];
  const core: LionTierOutput["core"] = {
    what_must_be_done: verdict.core.what_must_be_done,
  };

  if (config.show_what_is_happening) {
    core.what_is_happening = verdict.core.what_is_happening;
  }

  if (config.show_what_will_happen) {
    core.what_will_happen = verdict.core.what_will_happen;
  }

  const guidance = sliceArray(verdict.guidance_codes, config.guidance_limit);
  const output: LionTierOutput = {
    lion_status: verdict.lion_status,
    headline: verdict.headline,
    core,
    actions: sliceArray(verdict.action_codes, config.action_limit),
  };

  if (guidance.length > 0) {
    output.guidance = guidance;
  }

  if (config.include_meta) {
    output.meta = verdict.meta;
  }

  return output;
}
