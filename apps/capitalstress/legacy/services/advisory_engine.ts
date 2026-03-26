/**
 * Capital Stress advisory — re-exports the Lion's Verdict engine from @cb/advisory-graph.
 * Do not add scoring or verdict logic here; extend packages/advisory-graph/src/lionsVerdict instead.
 */

export type { VerdictNarrative, MicroSignal } from '@cb/advisory-graph/lionsVerdict';
export {
  generateLionsVerdict,
  getLionOpening,
  getMicroDiagnosticSignals,
  getKeyTakeaways,
  getRecommendedAdjustments,
  runLionVerdictEngineStress,
  toVerdictNarrative,
} from '@cb/advisory-graph/lionsVerdict';
