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

export type { LionHealthVerdictJsonVars, LionVerdictJson, LionVerdictJsonKey } from './lionVerdictJson';
export {
  LION_VERDICT_JSON_KEYS,
  LION_VERDICT_JSON_SCHEMA,
  LION_VERDICT_JSON_SCHEMA_VERSION,
  assertLionVerdictJson,
  formatLionAmountForJson,
  isLionVerdictJson,
  normalizeLionVerdictForJson,
  runLionVerdictEngineCapitalHealthJson,
  runLionVerdictEngineForeverJson,
  runLionVerdictEngineStressJson,
  stringifyLionVerdictJsonCanonical,
  stripCurrencyMarkersFromText,
} from './lionVerdictJson';

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
  lionTierFromTechnicalResilience,
  stressScoreToDisplay0to100,
  technicalResilienceToLion0to100,
  toVerdictNarrative,
} from './engine';

export type {
  LionClientCapitalUnlock,
  LionClientCapitalUnlockDecision,
  LionClientGoalGap,
  LionClientProgress,
  LionClientScenarioActions,
  LionClientStrategicOption,
  LionClientStrategicOptionType,
  LionClientVerdictBlock,
  LionClientVerdictStatus,
  LionVerdictClientReport,
} from './clientVerdictTypes';

export { LION_VERDICT_CLIENT_SCHEMA, LION_VERDICT_CLIENT_SCHEMA_VERSION } from './clientVerdictSchema';

export type { BuildClientVerdictOptions, ClientVerdictGoalContext } from './buildClientVerdictFromStress';
export {
  buildLionVerdictClientReportFromStress,
  clientVerdictStatusFromScore0to100,
  clientVerdictStatusFromStress,
  isLionVerdictClientReport,
  pickStricterClientVerdictStatus,
  resolveClientVerdictStatusForStress,
  stringifyLionVerdictClientReportCanonical,
} from './buildClientVerdictFromStress';

export type { BuildForeverClientVerdictOptions } from './buildClientVerdictFromForever';
export {
  buildLionVerdictClientReportFromForever,
  parseForeverRunway,
} from './buildClientVerdictFromForever';

export type {
  BuildIncomeEngineeringClientVerdictOptions,
  IncomeEngineeringClientVerdictInputs,
  IncomeEngineeringSustainabilityStatus,
} from './buildClientVerdictFromIncomeEngineering';
export { buildLionVerdictClientReportFromIncomeEngineering } from './buildClientVerdictFromIncomeEngineering';

export type {
  BuildCapitalHealthClientVerdictOptions,
  CapitalHealthClientVerdictInputs,
} from './buildClientVerdictFromCapitalHealth';
export { buildLionVerdictClientReportFromCapitalHealth } from './buildClientVerdictFromCapitalHealth';

export type {
  LionPublicVerdictStatus,
  LionStrongEligibility,
  LionStressGoalStrongSnapshot,
} from './lionScoreMapping';
export {
  formatLionPublicStatusLabel,
  incomeEngineeringCoverageToLion0to100,
  lionPublicStatusFromScore0to100,
  lionStrongEligible,
  lionStrongEligibilityFromForeverInput,
  lionStrongEligibilityFromHealthTier,
  lionStrongEligibilityFromIncomeEngineering,
  lionStrongEligibilityFromStressInputs,
} from './lionScoreMapping';
