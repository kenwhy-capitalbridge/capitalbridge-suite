import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

type ModelKey =
  | "forever-income-model"
  | "income-engineering-model"
  | "capital-health-model"
  | "capital-stress-model";

type Body = {
  model_key?: string;
  status?: "draft" | "completed" | "failed" | "invalid_preconditions";
  /** Single code or multiple (taxonomy); arrays are deduped and sorted for stable JSON. */
  precondition_reason?: string | string[];
  input?: unknown;
  output?: unknown;
  shared_facts?: Record<string, unknown>;
};

const PRECONDITION_REASON_TAXONOMY: Set<string> = new Set([
  "no_income_streams",
  "no_obligations",
  "no_assets",
  "withdrawal_not_defined",
  "preconditions_not_met",
] as const);

type JsonObject = Record<string, unknown>;

function isModelKey(v: string): v is ModelKey {
  return (
    v === "forever-income-model" ||
    v === "income-engineering-model" ||
    v === "capital-health-model" ||
    v === "capital-stress-model"
  );
}

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizePreconditionReason(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return PRECONDITION_REASON_TAXONOMY.has(raw) ? raw : "";
}

/** Returns deduped taxonomy codes in sorted order for deterministic payloads. */
function normalizePreconditionReasons(value: unknown): string[] {
  if (typeof value === "string") {
    const one = normalizePreconditionReason(value);
    return one ? [one] : [];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const v of value) {
      const one = normalizePreconditionReason(v);
      if (one && !out.includes(one)) out.push(one);
    }
    out.sort();
    return out;
  }
  return [];
}

function mergePreconditionReasons(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b])).sort();
}

/** Invalid runs: only null or absent — never `{}` (avoids dual semantics downstream). */
function modelSpecificPayloadAllowedForInvalid(value: unknown): boolean {
  return value === undefined || value === null;
}

/** Required non-null metric keys per platform model_key for status=completed (no partial completion). */
function requiredCompletedMetricKeys(modelKey: ModelKey): readonly string[] {
  switch (modelKey) {
    case "income-engineering-model":
      return ["cashflow_coverage_ratio", "income_gap_monthly"];
    case "capital-stress-model":
      return ["survival_probability_pct", "resilience_score_0_100"];
    case "capital-health-model":
      return ["withdrawal_sustainability_ratio", "runway_months"];
    case "forever-income-model":
      return ["required_capital", "runway_months"];
  }
}

function completedMetricsAreComplete(modelKey: ModelKey, metrics: unknown): boolean {
  if (!isObject(metrics)) return false;
  for (const key of requiredCompletedMetricKeys(modelKey)) {
    const v = metrics[key];
    if (v === null || v === undefined) return false;
  }
  return true;
}

async function ensureActiveMembershipForUser(userId: string) {
  const supabase = await createAppServerClient();
  const { data, error } = await supabase
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false as const };
  return { ok: !!data };
}

export async function POST(req: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const access = await ensureActiveMembershipForUser(user.id);
    if (!access.ok) return NextResponse.json({ error: "membership_inactive" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const modelKey = String(body.model_key ?? "");
    if (!isModelKey(modelKey)) {
      return NextResponse.json({ error: "invalid_model_key" }, { status: 400 });
    }
    const status = body.status ?? "completed";
    const preconditionReasonsBody = normalizePreconditionReasons(body.precondition_reason);
    if (status === "invalid_preconditions" && preconditionReasonsBody.length === 0 && body.output === undefined) {
      return NextResponse.json({ error: "missing_precondition_reason" }, { status: 400 });
    }

    const { data: run, error: runErr } = await supabase
      .schema("public")
      .from("model_runs")
      .insert({
        user_id: user.id,
        model_key: modelKey,
        source_app: "advisoryplatform",
        status,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr || !run?.id) {
      console.error("[api/model/run] create run failed", runErr?.message);
      return NextResponse.json({ error: "create_run_failed" }, { status: 500 });
    }

    if (body.input !== undefined) {
      const { error } = await supabase.schema("public").from("model_inputs").insert({
        run_id: run.id,
        user_id: user.id,
        payload: body.input as object,
      });
      if (error) {
        console.error("[api/model/run] insert input failed", error.message);
        return NextResponse.json({ error: "create_input_failed" }, { status: 500 });
      }
    }

    let outputPayload: JsonObject | undefined =
      body.output !== undefined
        ? (body.output as JsonObject)
        : status === "invalid_preconditions"
          ? ({
              output_normalized: {
                status: "invalid_preconditions",
                reason:
                  preconditionReasonsBody.length > 0 ? preconditionReasonsBody : ["preconditions_not_met"],
                metrics: null,
                model_specific_payload: null,
              },
            } as JsonObject)
          : undefined;

    if (status === "invalid_preconditions") {
      if (!outputPayload || !isObject(outputPayload)) {
        return NextResponse.json({ error: "invalid_output_payload" }, { status: 400 });
      }
      const normalized = isObject(outputPayload.output_normalized) ? outputPayload.output_normalized : {};
      const reasonsFromPayload = normalizePreconditionReasons(normalized.reason);
      const reasonsMerged = mergePreconditionReasons(preconditionReasonsBody, reasonsFromPayload);
      const reasons = reasonsMerged.length > 0 ? reasonsMerged : ["preconditions_not_met"];
      const metricsValue = normalized.metrics;
      if (metricsValue !== undefined && metricsValue !== null) {
        return NextResponse.json({ error: "invalid_precondition_metrics_must_be_null" }, { status: 400 });
      }
      const msp = normalized.model_specific_payload;
      if (!modelSpecificPayloadAllowedForInvalid(msp)) {
        return NextResponse.json({ error: "invalid_precondition_model_specific_payload_must_be_null" }, { status: 400 });
      }
      outputPayload = {
        ...outputPayload,
        output_normalized: {
          ...normalized,
          status: "invalid_preconditions",
          reason: [...reasons],
          metrics: null,
          model_specific_payload: null,
        },
      };
    }

    if (status === "completed") {
      if (!outputPayload || !isObject(outputPayload)) {
        return NextResponse.json({ error: "missing_output_for_completed" }, { status: 400 });
      }
      const normalized = isObject(outputPayload.output_normalized) ? outputPayload.output_normalized : null;
      if (!normalized || normalized.metrics == null) {
        return NextResponse.json({ error: "completed_metrics_required" }, { status: 400 });
      }
      if (!completedMetricsAreComplete(modelKey, normalized.metrics)) {
        return NextResponse.json({ error: "completed_metrics_incomplete" }, { status: 400 });
      }
    }

    if (outputPayload !== undefined) {
      const { error } = await supabase.schema("public").from("model_outputs").insert({
        run_id: run.id,
        user_id: user.id,
        payload: outputPayload,
      });
      if (error) {
        console.error("[api/model/run] insert output failed", error.message);
        return NextResponse.json({ error: "create_output_failed" }, { status: 500 });
      }
    }

    if (body.shared_facts && typeof body.shared_facts === "object") {
      const rows = Object.entries(body.shared_facts).map(([fact_key, fact_value]) => ({
        user_id: user.id,
        fact_key,
        fact_value: fact_value as object,
        source_model_key: modelKey,
        run_id: run.id,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .schema("public")
          .from("model_shared_facts")
          .upsert(rows, { onConflict: "user_id,fact_key" });
        if (error) {
          console.error("[api/model/run] upsert shared facts failed", error.message);
          return NextResponse.json({ error: "upsert_shared_facts_failed" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, run_id: run.id });
  } catch (e) {
    console.error("[api/model/run]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
