import type { ModelRunResult } from "./arbitration";
import { runLionArbitration } from "./arbitration";
import { mapExternalModelKey } from "./model-key-map";
import {
  deriveSignalsFromMetrics,
  type NormalizedMetrics,
} from "./signal-adapter";
import { applyLionTier, type LionTier, type LionTierOutput } from "./tier";
import { buildLionVerdict, type LionVerdict } from "./verdict";

export type LionPipelineModelRunInput = {
  model_key: string;
  status: "completed" | "invalid_preconditions" | "failed";
  output_normalized?: {
    metrics?: NormalizedMetrics | null;
    reason?: string[] | string | null;
  } | null;
};

export type LionPipelineContext = {
  capital_graph_id: string;
  version: number;
  model_key?: string;
  tier: LionTier;
};

export type LionPipelineResult = {
  model_results: ModelRunResult[];
  verdict: LionVerdict;
  output: LionTierOutput;
  progress: {
    completed_models: number;
    total_models: number;
  };
};

function normalizeReason(reason: unknown): string[] {
  if (Array.isArray(reason)) {
    return Array.from(
      new Set(reason.filter((value): value is string => typeof value === "string"))
    ).sort();
  }

  if (typeof reason === "string" && reason.trim()) {
    return [reason.trim()];
  }

  return [];
}

export function buildModelRunResults(
  runs: LionPipelineModelRunInput[]
): ModelRunResult[] {
  return runs
    .map((run): ModelRunResult => {
      const model_key = mapExternalModelKey(run.model_key);

      if (run.status === "completed") {
        return {
          model_key,
          status: "completed",
          signals: deriveSignalsFromMetrics(
            model_key,
            run.output_normalized?.metrics
          ),
        };
      }

      return {
        model_key,
        status: "invalid_preconditions",
        reason:
          run.status === "failed"
            ? ["preconditions_not_met"]
            : normalizeReason(run.output_normalized?.reason),
      };
    })
    .sort((a, b) => a.model_key.localeCompare(b.model_key));
}

export function runLionPipeline(
  runs: LionPipelineModelRunInput[],
  context: LionPipelineContext
): LionPipelineResult {
  const modelResults = buildModelRunResults(runs);
  const totalModels = 4;
  const completedModels = modelResults.filter(
    (model) => model.status === "completed"
  ).length;
  const arbitration = runLionArbitration(modelResults);
  const verdict = buildLionVerdict(arbitration, {
    capital_graph_id: context.capital_graph_id,
    version: context.version,
    model_key: context.model_key ?? "multi_model",
  });

  return {
    model_results: modelResults,
    verdict,
    output: applyLionTier(verdict, context.tier),
    progress: {
      completed_models: completedModels,
      total_models: totalModels,
    },
  };
}
