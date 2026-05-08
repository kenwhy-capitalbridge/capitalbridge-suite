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
type AdvisoryModelType = "forever-income" | "income-engineering" | "capital-health" | "capital-stress";

const REQUIRED_MODELS: RequiredModel[] = [
  { model_key: "income-engineering-model", criticality: "HIGH" },
  { model_key: "capital-health-model", criticality: "HIGH" },
  { model_key: "capital-stress-model", criticality: "MEDIUM" },
  { model_key: "forever-income-model", criticality: "MEDIUM" },
];

const MODEL_KEYS = new Set<string>(
  REQUIRED_MODELS.map((model) => model.model_key)
);

const MODEL_KEY_TO_ADVISORY_TYPE: Record<ModelKey, AdvisoryModelType> = {
  "forever-income-model": "forever-income",
  "income-engineering-model": "income-engineering",
  "capital-health-model": "capital-health",
  "capital-stress-model": "capital-stress",
};

const ADVISORY_TYPE_TO_MODEL_KEY: Record<AdvisoryModelType, ModelKey> = {
  "forever-income": "forever-income-model",
  "income-engineering": "income-engineering-model",
  "capital-health": "capital-health-model",
  "capital-stress": "capital-stress-model",
};

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

function pickNumber(obj: JsonObject, keys: string[]): number | null {
  for (const key of keys) {
    const direct = parseMetricNumber(obj[key]);
    if (direct !== null) return direct;
  }
  return null;
}

function advisoryReportToNormalizedMetrics(modelKey: ModelKey, reportResults: unknown): NormalizedMetrics | null {
  if (!isObject(reportResults)) return null;
  const r = reportResults;
  switch (modelKey) {
    case "income-engineering-model": {
      const cashflow_coverage_ratio = pickNumber(r, ["cashflow_coverage_ratio", "cashflowCoverageRatio"]);
      const income_gap_monthly = pickNumber(r, ["income_gap_monthly", "incomeGapMonthly"]);
      if (cashflow_coverage_ratio === null || income_gap_monthly === null) return null;
      return { cashflow_coverage_ratio, income_gap_monthly } as unknown as NormalizedMetrics;
    }
    case "capital-health-model": {
      const withdrawal_sustainability_ratio = pickNumber(r, [
        "withdrawal_sustainability_ratio",
        "withdrawalSustainabilityRatio",
      ]);
      const runway_months = pickNumber(r, ["runway_months", "runwayMonths"]);
      if (withdrawal_sustainability_ratio === null || runway_months === null) return null;
      return { withdrawal_sustainability_ratio, runway_months } as unknown as NormalizedMetrics;
    }
    case "capital-stress-model": {
      const survival_probability_pct = pickNumber(r, ["survival_probability_pct", "survivalProbabilityPct"]);
      const resilience_score_0_100 = pickNumber(r, ["resilience_score_0_100", "resilienceScore0_100", "resilienceScore"]);
      if (survival_probability_pct === null || resilience_score_0_100 === null) return null;
      return { survival_probability_pct, resilience_score_0_100 } as unknown as NormalizedMetrics;
    }
    case "forever-income-model": {
      const required_capital = pickNumber(r, ["required_capital", "requiredCapital"]);
      const runway_months = pickNumber(r, ["runway_months", "runwayMonths"]);
      if (required_capital === null || runway_months === null) return null;
      return { required_capital, runway_months } as unknown as NormalizedMetrics;
    }
  }
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

    const { data: advisoryReports, error: advisoryReportsError } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .select("model_type, results, created_at")
      .eq("user_id", user.id)
      .in("model_type", Object.values(MODEL_KEY_TO_ADVISORY_TYPE))
      .order("created_at", { ascending: false });

    if (advisoryReportsError) {
      console.error("[api/lion/verdict] advisory_reports query failed", advisoryReportsError.message);
      return NextResponse.json({ error: "advisory_reports_query_failed" }, { status: 500 });
    }

    const latestAdvisoryByModelKey = new Map<ModelKey, JsonObject>();
    for (const row of advisoryReports ?? []) {
      const modelType = String(row.model_type ?? "") as AdvisoryModelType;
      if (!(modelType in ADVISORY_TYPE_TO_MODEL_KEY)) continue;
      const modelKey = ADVISORY_TYPE_TO_MODEL_KEY[modelType];
      if (latestAdvisoryByModelKey.has(modelKey)) continue;
      latestAdvisoryByModelKey.set(modelKey, isObject(row.results) ? row.results : {});
    }

    const completedModelKeys = new Set<ModelKey>();
    for (const model of REQUIRED_MODELS) {
      const run = latestRuns.get(model.model_key);
      const payload = run ? outputsByRunId.get(run.id) : null;
      const normalized = isObject(payload?.output_normalized) ? payload.output_normalized : null;
      const hasCompletedRun = run?.status === "completed" && isObject(normalized?.metrics);
      const hasAdvisoryReport = latestAdvisoryByModelKey.has(model.model_key);
      const reportMetrics = advisoryReportToNormalizedMetrics(
        model.model_key,
        latestAdvisoryByModelKey.get(model.model_key),
      );
      if (hasCompletedRun || hasAdvisoryReport || reportMetrics) completedModelKeys.add(model.model_key);
    }

    const modelRuns: LionPipelineModelRunInput[] = REQUIRED_MODELS.map((model) => {
      const run = latestRuns.get(model.model_key);
      if (!run) {
        const reportMetrics = advisoryReportToNormalizedMetrics(
          model.model_key,
          latestAdvisoryByModelKey.get(model.model_key),
        );
        if (reportMetrics) {
          return {
            model_key: model.model_key,
            status: "completed",
            output_normalized: { metrics: reportMetrics, reason: [] },
          };
        }
        if (latestAdvisoryByModelKey.has(model.model_key)) {
          return {
            model_key: model.model_key,
            status: "completed",
            output_normalized: { metrics: null, reason: [] },
          };
        }
        return fallbackRunForMissingModel(model);
      }

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

      const reportMetrics = advisoryReportToNormalizedMetrics(
        model.model_key,
        latestAdvisoryByModelKey.get(model.model_key),
      );
      if (reportMetrics) {
        return {
          model_key: model.model_key,
          status: "completed",
          output_normalized: { metrics: reportMetrics, reason: [] },
        };
      }
      if (latestAdvisoryByModelKey.has(model.model_key)) {
        return {
          model_key: model.model_key,
          status: "completed",
          output_normalized: { metrics: null, reason: [] },
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
      (model) => !completedModelKeys.has(model.model_key)
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
      progress: {
        completed_models: completedModelKeys.size,
        total_models: REQUIRED_MODELS.length,
      },
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
