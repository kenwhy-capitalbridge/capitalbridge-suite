import "server-only";

import { listReports, saveReport, type ModelType } from "../platformAccess";
import { getAdvisoryRequestContext } from "./requestContext";

export type AdvisoryJsonResult = { status: number; body: unknown };

function resolveModelType(base: ModelType, envKey?: string): ModelType {
  if (!envKey) return base;
  const v = process.env[envKey];
  if (typeof v === "string" && v.trim().length > 0) return v.trim() as ModelType;
  return base;
}

/**
 * GET /api/advisory-report — list (`?list=1`), single (`?id=`), or 400.
 * `envOverrideKey` optional: e.g. `ADVISORY_FOREVER_MODEL_TYPE` to override DB `model_type`.
 */
export async function handleAdvisoryReportGET(
  request: Request,
  modelType: ModelType,
  logTag: string,
  envOverrideKey?: string
): Promise<AdvisoryJsonResult> {
  const MODEL = resolveModelType(modelType, envOverrideKey);
  try {
    let user: { id: string };
    let db: Awaited<ReturnType<typeof getAdvisoryRequestContext>>["db"];
    try {
      const ctx = await getAdvisoryRequestContext();
      user = ctx.user;
      db = ctx.db;
    } catch {
      return { status: 401, body: { error: "unauthorized" } };
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const list = url.searchParams.get("list");

    if (id) {
      const { data, error } = await db
        .schema("advisory_v2")
        .from("advisory_reports")
        .select("id, created_at, inputs, results")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) {
        return { status: 404, body: { error: "not_found" } };
      }
      return {
        status: 200,
        body: {
          id: String(data.id),
          created_at: String(data.created_at ?? ""),
          inputs: (data.inputs as Record<string, unknown>) ?? {},
          results: (data.results as Record<string, unknown>) ?? {},
        },
      };
    }

    if (list === "1") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const items = await listReports(db, user.id, MODEL, limit);
      return { status: 200, body: { items } };
    }

    return { status: 400, body: { error: "bad_request" } };
  } catch (e) {
    console.error(`${logTag} GET`, e);
    return { status: 500, body: { error: "server_error" } };
  }
}

export async function handleAdvisoryReportPOST(
  request: Request,
  modelType: ModelType,
  logTag: string,
  envOverrideKey?: string
): Promise<AdvisoryJsonResult> {
  const MODEL = resolveModelType(modelType, envOverrideKey);
  try {
    let user: { id: string };
    let db: Awaited<ReturnType<typeof getAdvisoryRequestContext>>["db"];
    try {
      const ctx = await getAdvisoryRequestContext();
      user = ctx.user;
      db = ctx.db;
    } catch {
      return { status: 401, body: { error: "unauthorized" } };
    }

    const body = (await request.json()) as {
      sessionId?: string;
      inputs?: Record<string, unknown>;
      results?: Record<string, unknown>;
    };

    let sessionId = body.sessionId;
    if (!sessionId) {
      const { data: s, error: se } = await db
        .schema("advisory_v2")
        .from("advisory_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (se || !s?.id) {
        console.error(`${logTag} POST session`, se?.message);
        return { status: 500, body: { error: se?.message ?? "session_failed" } };
      }
      sessionId = String(s.id);
    }

    const out = await saveReport(db, {
      sessionId,
      userId: user.id,
      modelType: MODEL,
      inputs: body.inputs ?? {},
      results: body.results ?? {},
    });

    if ("error" in out) {
      console.error(`${logTag} POST`, out.error);
      return { status: 500, body: { error: out.error } };
    }

    return { status: 200, body: out };
  } catch (e) {
    console.error(`${logTag} POST`, e);
    return { status: 500, body: { error: "server_error" } };
  }
}

export async function handleAdvisorySessionPOST(logTag: string): Promise<AdvisoryJsonResult> {
  try {
    let user: { id: string };
    let db: Awaited<ReturnType<typeof getAdvisoryRequestContext>>["db"];
    try {
      const ctx = await getAdvisoryRequestContext();
      user = ctx.user;
      db = ctx.db;
    } catch {
      return { status: 401, body: { error: "unauthorized" } };
    }

    const { data, error } = await db
      .schema("advisory_v2")
      .from("advisory_sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (error) {
      console.error(logTag, error.message);
      return { status: 500, body: { error: error.message } };
    }
    if (!data?.id) {
      return { status: 500, body: { error: "no_session_id" } };
    }
    return { status: 200, body: { id: data.id } };
  } catch (e) {
    console.error(logTag, e);
    return { status: 500, body: { error: "server_error" } };
  }
}
