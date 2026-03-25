/**
 * Platform access helpers for advisory_v2: persona, entitlements, sessions, reports.
 * Tree-shakable; use Supabase client from caller (browser or server).
 * All advisory_v2 access via schema-qualified calls where supported.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Plan slug from persona or default (`strategic` = catalog 365-day tier; same feature gates as `yearly`). */
export type Plan = "trial" | "monthly" | "quarterly" | "yearly" | "strategic";

/** Persona returned by advisory_v2.get_user_persona. */
export type Persona = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  active_plan: Plan | null;
  expires_at: string | null;
};

/** Entitlements derived from plan. */
export type Entitlements = {
  plan: Plan;
  canSaveToServer: boolean;
  canSeeVerdict: boolean;
  canUseStressModel: boolean;
  canSeeSolutions: boolean;
};

/** Model type for advisory reports. */
export type ModelType =
  | "forever-income"
  | "income-engineering"
  | "capital-health"
  | "capital-stress";

/** Try public.get_user_persona first; on PGRST202/404-style error fall back to advisory_v2.get_user_persona. */
function isRpcNotFound(err: { code?: string; message?: string }): boolean {
  const code = String(err?.code ?? "").toUpperCase();
  const msg = String(err?.message ?? "").toLowerCase();
  return code === "PGRST202" || code === "42883" || msg.includes("could not find") || msg.includes("does not exist");
}

/**
 * Fetches current user persona via RPC: tries public.get_user_persona first, then advisory_v2.get_user_persona.
 * Returns null on error (logs concise warning).
 */
export async function fetchPersona(
  supabase: SupabaseClient
): Promise<Persona | null> {
  const client = supabase as { rpc: (name: string) => ReturnType<SupabaseClient["rpc"]>; schema: (s: string) => { rpc: (name: string) => ReturnType<SupabaseClient["rpc"]> } };
  try {
    let result = await client.rpc("get_user_persona");
    if (result.error && isRpcNotFound(result.error)) {
      result = await client.schema("advisory_v2").rpc("get_user_persona");
    }
    const { data, error } = result;
    if (error) {
      console.warn("[platformAccess] get_user_persona failed:", error.message);
      return null;
    }
    if (!data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    return {
      user_id: String(row.user_id ?? ""),
      full_name: row.full_name != null ? String(row.full_name) : null,
      email: row.email != null ? String(row.email) : null,
      active_plan: normalizePlan(row.active_plan),
      expires_at: row.expires_at != null ? String(row.expires_at) : null,
    };
  } catch (e) {
    console.warn("[platformAccess] fetchPersona error:", e);
    return null;
  }
}

function normalizePlan(v: unknown): Plan | null {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  if (s === "trial" || s === "monthly" || s === "quarterly" || s === "yearly")
    return s as Plan;
  return null;
}

/**
 * Derives entitlements from plan.
 * Default plan is 'trial' when null/unknown.
 */
export function deriveEntitlements(plan: Plan | null): Entitlements {
  const p: Plan = plan ?? "trial";
  const flagship = p === "yearly" || p === "strategic";
  return {
    plan: p,
    canSaveToServer: p !== "trial",
    canSeeVerdict: p !== "trial",
    canUseStressModel: p !== "trial",
    canSeeSolutions: flagship,
  };
}

/**
 * Starts an advisory session in advisory_v2.advisory_sessions.
 * Returns { id } or error object for UI handling.
 */
export async function startSession(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_sessions")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) return { error: error.message };
    const id = data?.id;
    if (!id) return { error: "No session id returned" };
    return { id: String(id) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}

/**
 * Saves a report to advisory_v2.advisory_reports.
 * Returns { id, created_at } or error (no throw) for UI handling.
 */
export async function saveReport(
  supabase: SupabaseClient,
  params: {
    sessionId: string;
    userId: string;
    modelType: ModelType;
    inputs: Record<string, unknown>;
    results: Record<string, unknown>;
  }
): Promise<{ id: string; created_at: string } | { error: string }> {
  try {
    const { data, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .insert({
        session_id: params.sessionId,
        user_id: params.userId,
        model_type: params.modelType,
        inputs: params.inputs as Record<string, unknown>,
        results: params.results as Record<string, unknown>,
      })
      .select("id, created_at")
      .single();
    if (error) return { error: error.message };
    const id = data?.id;
    const created_at = data?.created_at;
    if (!id) return { error: "No report id returned" };
    return {
      id: String(id),
      created_at: created_at != null ? String(created_at) : new Date().toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}

/**
 * Lists up to `limit` reports for user and model type, newest first.
 */
export async function listReports(
  supabase: SupabaseClient,
  userId: string,
  modelType: ModelType,
  limit = 20
): Promise<{ id: string; created_at: string }[]> {
  try {
    const { data, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("model_type", modelType)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("[platformAccess] listReports failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: String(row.id),
      created_at: String(row.created_at ?? ""),
    }));
  } catch (e) {
    console.warn("[platformAccess] listReports error:", e);
    return [];
  }
}

/**
 * Fetches a single report by id (including inputs/results) for restoration.
 */
export async function getReport(
  supabase: SupabaseClient,
  reportId: string
): Promise<{
  id: string;
  created_at: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
} | null> {
  try {
    const { data, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .select("id, created_at, inputs, results")
      .eq("id", reportId)
      .single();
    if (error || !data) return null;
    return {
      id: String(data.id),
      created_at: String(data.created_at ?? ""),
      inputs: (data.inputs as Record<string, unknown>) ?? {},
      results: (data.results as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}
