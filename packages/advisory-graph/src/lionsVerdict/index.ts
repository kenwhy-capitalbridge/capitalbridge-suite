/**
 * Lion's Verdict Engine — public API.
 *
 * All score, status, verdict copy, and recommendation lists are produced here only.
 * Model apps supply domain inputs via the `runLionVerdictEngine*` functions.
 */

export type {
  ForeverLionInputs,
  LionFragilityLevel,
  LionHealthVariables,
  LionScoreTier,
  LionStressAdvisoryInputs,
  LionVerdictOutput,
  MicroSignal,
  VerdictNarrative,
} from './types';

export {
  capitalHealthVerdictExportText,
  generateLionsVerdict,
  getKeyTakeaways,
  getLionOpening,
  getMicroDiagnosticSignals,
  getRecommendedAdjustments,
  healthTierToLion,
  runLionVerdictEngineCapitalHealth,
  runLionVerdictEngineForever,
  runLionVerdictEngineStress,
  stressScoreToDisplay0to100,
  toVerdictNarrative,
} from './engine';
