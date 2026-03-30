/**
 * Fixed lists for paid Lion layout — every string is copied verbatim from `copy.ts` (LION_COPY guidance pools).
 */

import type { Tier } from "./copy";

export const LION_PRESET_STRATEGIC_OPTIONS: Record<Tier, readonly [string, string, string]> = {
  STRONG: [
    "No corrective action is needed. Maintain current course. Optimisation is optional.",
    "Flexibility is available without weakening stability. Adjustments can be made safely. The base remains protected.",
    "Focus can shift from protection to optimisation. The system is already secure.",
  ],
  STABLE: [
    "Plan remains viable, but not overbuilt. Small changes can impact outcomes. Reinforcement is advisable.",
    "Small optimisation in returns or contributions will improve resilience. This strengthens the system.",
    "Returns support income, but leave little excess. Building buffer is recommended.",
  ],
  FRAGILE: [
    "Limited buffer is available. Downside scenarios may lead to shortfall. Reinforcement is recommended.",
    "Adjustments are not urgent, but should not be delayed. Timing matters for recovery.",
    "Small improvements can restore stability. Action is beneficial at this stage.",
  ],
  AT_RISK: [
    "Immediate optimisation is required. Reducing withdrawals or increasing contributions is necessary.",
    "Without adjustment, depletion becomes likely. Recovery becomes harder over time.",
    "Recovery remains possible, but requires action now. Delay increases risk.",
  ],
  NOT_SUSTAINABLE: [
    "Immediate corrective action is non-optional. The system cannot continue as is.",
    "Delay will worsen outcomes. Available recovery options will reduce quickly.",
    "Recovery is possible but requires significant change. Minor adjustments are not sufficient.",
  ],
};

/** Single guidance line per tier — verbatim from `copy.ts`. */
export const LION_PRESET_DECISION_BOUNDARY: Record<Tier, string> = {
  STRONG:
    "No corrective action is needed. Maintain current course. Optimisation is optional.",
  STABLE:
    "Stability is present, but not excess. The system performs within limits. Improvement is recommended.",
  FRAGILE:
    "Monitoring and light intervention are required. Passive approach is not sufficient.",
  AT_RISK: "Corrective action is required to restore balance. The system cannot continue as is.",
  NOT_SUSTAINABLE: "Continuation without change guarantees failure. Action must be immediate.",
};
