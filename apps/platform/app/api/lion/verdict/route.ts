import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import {
  runLionPipeline,
  type LionPipelineModelRunInput,
  type NormalizedMetrics,
} from "@cb/lion-verdict";

export const dynamic = "force-dynamic";

type ModelKey =
  | "income-engineering-model"
  | "capital-health-model"
  | "capital-stress-model"
  | "forever-income-model";

type RequiredModel = {
  model_key: ModelKey;
  criticality: "HIGH" | "MEDIUM";
};

type JsonObject = Record<string, unknown>;

const REQUIRED_MODELS: RequiredModel[] = [
  { model_key: "income-engineering-model", criticality: "HIGH" },
  { model_key: "capital-health-model", criticality: "HIGH" },
  { model_key: "capital-stress-model", criticality: "MEDIUM" },
  { model_key: "forever-income-model", criticality: "MEDIUM" },
];

const MODEL_KEYS = new Set<string>(
  REQUIRED_MODELS.map((model) => model.model_key)
);

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function actionLabel(actionCode: string): string {
  switch (actionCode) {
    case "increase_income":
      return "Increase income";
    case "reduce_obligations":
    case "reduce_obligation":
      return "Reduce obligations";
    case "increase_liquidity_buffer":
      return "Increase liquidity buffer";
    case "extend_runway":
      return "Extend runway";
    case "improve_resilience":
      return "Improve resilience";
    case "define_income_streams":
      return "Define income streams";
    case "define_obligations":
      return "Define obligations";
    case "establish_capital_base":
      return "Define capital base";
    case "define_withdrawal_strategy":
      return "Define withdrawal strategy";
    case "complete_required_inputs":
      return "Complete required inputs";
    default:
      return actionCode
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function actionDeepLink(actionCode: string): string | undefined {
  switch (actionCode) {
    case "increase_income":
    case "define_income_streams":
      return "/framework";
    case "reduce_obligations":
    case "reduce_obligation":
    case "define_obligations":
      return "/framework";
    case "establish_capital_base":
    case "define_withdrawal_strategy":
    case "complete_required_inputs":
      return "/framework";
    default:
      return undefined;
  }
}

function priorityForIndex(index: number): 1 | 2 | 3 {
  if (index <= 0) return 1;
  if (index === 1) return 2;
  return 3;
}

function fallbackRunForMissingModel(model: RequiredModel): LionPipelineModelRunInput {
  return {
    model_key: model.model_key,
    status: "invalid_preconditions",
    output_normalized: {
      metrics: null,
      reason:
        model.criticality === "HIGH"
          ? ["preconditions_not_met"]
          : [],
    },
  };
}

function parseMetricNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function metricsFromOutputPayload(payload: JsonObject): JsonObject | null {
  const normalized = payload.output_normalized;
  if (!isObject(normalized)) return null;
  const metrics = normalized.metrics;
  return isObject(metrics) ? metrics : null;
}

/** Values read from latest `model_outputs.output_normalized.metrics` only (no invented figures). */
function buildMetricsSnapshot(args: {
  latestRuns: Map<
    string,
    { id: string; model_key: string; status: string }
  >;
  outputsByRunId: Map<string, JsonObject>;
}): {
  income_engineering: {
    monthly_net_cashflow: number | null;
    cashflow_coverage_ratio: number | null;
  } | null;
  forever_income: {
    runway_months: number | null;
    required_capital: number | null;
  } | null;
  capital_health: {
    runway_months: number | null;
    withdrawal_sustainability_ratio: number | null;
  } | null;
  capital_stress: {
    survival_probability_pct: number | null;
    resilience_score_0_100: number | null;
  } | null;
  capital_gap: number | null;
} {
  const { latestRuns, outputsByRunId } = args;

  let income_engineering: {
    monthly_net_cashflow: number | null;
    cashflow_coverage_ratio: number | null;
  } | null = null;
  let forever_income: {
    runway_months: number | null;
    required_capital: number | null;
  } | null = null;
  let capital_health: {
    runway_months: number | null;
    withdrawal_sustainability_ratio: number | null;
  } | null = null;
  let capital_stress: {
    survival_probability_pct: number | null;
    resilience_score_0_100: number | null;
  } | null = null;
  let capital_gap: number | null = null;

  const readModel = (modelKey: ModelKey) => {
    const run = latestRuns.get(modelKey);
    if (!run || run.status !== "completed") return null;
    const payload = outputsByRunId.get(run.id);
    if (!payload) return null;
    return metricsFromOutputPayload(payload);
  };

  const ie = readModel("income-engineering-model");
  if (ie) {
    income_engineering = {
      monthly_net_cashflow: parseMetricNumber(ie.income_gap_monthly),
      cashflow_coverage_ratio: parseMetricNumber(ie.cashflow_coverage_ratio),
    };
  }

  const fi = readModel("forever-income-model");
  if (fi) {
    forever_income = {
      runway_months: parseMetricNumber(fi.runway_months),
      required_capital: parseMetricNumber(fi.required_capital),
    };
  }

  const ch = readModel("capital-health-model");
  if (ch) {
    capital_health = {
      runway_months: parseMetricNumber(ch.runway_months),
      withdrawal_sustainability_ratio: parseMetricNumber(ch.withdrawal_sustainability_ratio),
    };
  }

  const cs = readModel("capital-stress-model");
  if (cs) {
    capital_stress = {
      survival_probability_pct: parseMetricNumber(cs.survival_probability_pct),
      resilience_score_0_100: parseMetricNumber(cs.resilience_score_0_100),
    };
  }

  for (const model of REQUIRED_MODELS) {
    const m = readModel(model.model_key);
    if (!m) continue;
    const cg = parseMetricNumber(m.capital_gap);
    if (cg !== null) {
      capital_gap = cg;
      break;
    }
  }

  return {
    income_engineering,
    forever_income,
    capital_health,
    capital_stress,
    capital_gap,
  };
}

export async function GET() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: runs, error: runsError } = await supabase
      .schema("public")
      .from("model_runs")
      .select("id, model_key, status, created_at, updated_at")
      .eq("user_id", user.id)
      .in("model_key", Array.from(MODEL_KEYS))
      .order("updated_at", { ascending: false });

    if (runsError) {
      console.error("[api/lion/verdict] model_runs query failed", runsError.message);
      return NextResponse.json({ error: "model_runs_query_failed" }, { status: 500 });
    }

    const latestRuns = new Map<string, {
      id: string;
      model_key: string;
      status: "completed" | "invalid_preconditions" | "failed" | string;
    }>();

    for (const run of runs ?? []) {
      if (typeof run.model_key !== "string" || latestRuns.has(run.model_key)) {
        continue;
      }

      latestRuns.set(run.model_key, {
        id: String(run.id),
        model_key: run.model_key,
        status: String(run.status),
      });
    }

    const runIds = Array.from(latestRuns.values()).map((run) => run.id);
    const outputsByRunId = new Map<string, JsonObject>();

    if (runIds.length > 0) {
      const { data: outputs, error: outputsError } = await supabase
        .schema("public")
        .from("model_outputs")
        .select("run_id, payload, created_at")
        .in("run_id", runIds)
        .order("created_at", { ascending: false });

      if (outputsError) {
        console.error("[api/lion/verdict] model_outputs query failed", outputsError.message);
        return NextResponse.json({ error: "model_outputs_query_failed" }, { status: 500 });
      }

      for (const output of outputs ?? []) {
        const runId = String(output.run_id);
        if (outputsByRunId.has(runId)) continue;
        outputsByRunId.set(
          runId,
          isObject(output.payload) ? output.payload : {}
        );
      }
    }

    const modelRuns: LionPipelineModelRunInput[] = REQUIRED_MODELS.map((model) => {
      const run = latestRuns.get(model.model_key);
      if (!run) return fallbackRunForMissingModel(model);

      const payload = outputsByRunId.get(run.id) ?? {};
      const normalized = isObject(payload.output_normalized)
        ? payload.output_normalized
        : {};

      if (run.status === "completed") {
        return {
          model_key: model.model_key,
          status: "completed",
          output_normalized: {
            metrics: isObject(normalized.metrics)
              ? (normalized.metrics as NormalizedMetrics)
              : null,
            reason: normalizeReason(normalized.reason),
          },
        };
      }

      if (run.status === "invalid_preconditions") {
        return {
          model_key: model.model_key,
          status: "invalid_preconditions",
          output_normalized: {
            metrics: null,
            reason: normalizeReason(normalized.reason),
          },
        };
      }

      return {
        model_key: model.model_key,
        status: "failed",
        output_normalized: {
          metrics: null,
          reason: ["preconditions_not_met"],
        },
      };
    });

    const missingModels = REQUIRED_MODELS.filter(
      (model) => !latestRuns.has(model.model_key)
    );
    const hasMissingCritical = missingModels.some(
      (model) => model.criticality === "HIGH"
    );
    const executionGate = hasMissingCritical
      ? {
          level: "BLOCKED" as const,
          reason: "MISSING_CRITICAL_MODELS" as const,
        }
      : missingModels.length > 0
        ? {
            level: "RESTRICTED" as const,
            reason: "MISSING_NON_CRITICAL_MODELS" as const,
          }
        : {
            level: "ALLOWED" as const,
            reason: "VALID" as const,
          };

    const pipeline = runLionPipeline(modelRuns, {
      capital_graph_id: user.id,
      version: 0,
      model_key: "multi_model",
      tier: "STRATEGIC",
    });

    const metrics_snapshot = buildMetricsSnapshot({ latestRuns, outputsByRunId });

    return NextResponse.json({
      lion_status: pipeline.verdict.lion_status,
      agreement_level: pipeline.verdict.agreement_level,
      signal_summary: pipeline.verdict.signal_summary,
      reason: pipeline.verdict.reason,
      missing_models: missingModels,
      execution_gate: executionGate,
      progress: pipeline.progress,
      metrics_snapshot,
      narrative: {
        headline: pipeline.verdict.headline,
        what_is_happening: pipeline.verdict.narrative.what_is_happening,
        what_will_happen: pipeline.verdict.narrative.what_will_happen,
        what_must_be_done: pipeline.verdict.narrative.what_must_be_done,
      },
      actions: pipeline.verdict.action_codes.map((actionCode, index) => ({
        action_code: actionCode,
        label: actionLabel(actionCode),
        priority: priorityForIndex(index),
        deep_link: actionDeepLink(actionCode),
      })),
    });
  } catch (error) {
    console.error("[api/lion/verdict]", error);
    return NextResponse.json({ error: "lion_verdict_failed" }, { status: 500 });
  }
}
