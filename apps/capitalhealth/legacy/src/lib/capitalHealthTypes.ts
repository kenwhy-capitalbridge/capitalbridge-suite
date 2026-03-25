/**
 * Capital Health Platform — shared types for simulation and UI.
 * Preserves calculation integrity; no 'any'.
 */

import type { CalculatorInputs } from '../../calculator-types';

/** Inputs for capital health evaluation (alias to keep existing engine). */
export type CapitalInputs = CalculatorInputs;

/** Results from deterministic or Monte Carlo simulation. */
export interface RiskMetrics {
  survivalProbability: number;
  healthScore: number;
  /** 1–5; from getRiskTier(survivalProbability). */
  riskTier: number;
  /** e.g. "Very Strong", "Critical"; from getRiskTier(survivalProbability). */
  riskTierLabel: string;
  capitalHorizonMonths: number;
  downsideHorizonMonths: number | null;
  capitalPreservationConfidence: number;
  incomeCoveragePct: number;
  withdrawalPressure: number;
  stabilityScore: number;
  earlyLossRisk: number;
}

/** One scenario from the solver (Capital Decision Paths). */
export interface ScenarioAdjustments {
  reduceIncome: { targetMonthly: number; feasible: boolean };
  addCapital: { requiredStart: number; feasible: boolean };
  increaseReturn: { requiredAnnualPct: number; feasible: boolean };
  balancedAdjustment: { incomeReductionPct: number; capitalIncreasePct: number; returnIncreasePct: number; feasible: boolean };
}

export const TARGET_SURVIVAL_PCT = 80;
export const TARGET_SURVIVAL_PCT_HIGH = 90;
export const BALANCED_CAP_PCT = 30;
