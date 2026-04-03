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

function personaFromRpcRow(data: unknown): Persona | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const rawPlan = row.active_plan ?? row.plan_slug ?? row.plan;
  return {
    user_id: String(row.user_id ?? ""),
    full_name: row.full_name != null ? String(row.full_name) : null,
    email: row.email != null ? String(row.email) : null,
    active_plan: normalizePlan(rawPlan),
    expires_at: row.expires_at != null ? String(row.expires_at) : null,
  };
}

/** Higher = paid / more capable (used to pick best persona when merging RPCs). */
function planTier(plan: Plan | null): number {
  const p = plan ?? "trial";
  if (p === "trial") return 0;
  if (p === "monthly") return 1;
  if (p === "quarterly") return 2;
  if (p === "yearly" || p === "strategic") return 3;
  return 0;
}

function isWeakPersona(p: Persona | null): boolean {
  if (!p?.user_id) return true;
  return deriveEntitlements(p.active_plan).plan === "trial";
}

/**
 * Fetches current user persona via RPC: tries public.get_user_persona first, then advisory_v2.get_user_persona.
 * If public succeeds but returns trial/empty plan, also reads advisory_v2 and keeps the stronger plan (fixes
 * catalog slug / naming mismatches and divergent RPC logic).
 */
export async function fetchPersona(
  supabase: SupabaseClient
): Promise<Persona | null> {
  const client = supabase as {
    rpc: (name: string) => ReturnType<SupabaseClient["rpc"]>;
    schema: (s: string) => { rpc: (name: string) => ReturnType<SupabaseClient["rpc"]> };
  };
  try {
    let primary = await client.rpc("get_user_persona");
    let usedPublic = true;
    if (primary.error && isRpcNotFound(primary.error)) {
      primary = await client.schema("advisory_v2").rpc("get_user_persona");
      usedPublic = false;
    }
    const { data, error } = primary;
    if (error) {
      console.warn("[platformAccess] get_user_persona failed:", error.message);
      return null;
    }
    let persona = personaFromRpcRow(data);

    if (usedPublic && isWeakPersona(persona)) {
      const secondary = await client.schema("advisory_v2").rpc("get_user_persona");
      if (!secondary.error && secondary.data) {
        const other = personaFromRpcRow(secondary.data);
        if (other?.user_id && planTier(other.active_plan) > planTier(persona?.active_plan ?? null)) {
          persona = {
            ...other,
            full_name: persona?.full_name ?? other.full_name,
            email: persona?.email ?? other.email,
            expires_at: other.expires_at ?? persona?.expires_at ?? null,
          };
        } else if (!persona?.user_id && other?.user_id) {
          persona = other;
        }
      }
    }

    return persona;
  } catch (e) {
    console.warn("[platformAccess] fetchPersona error:", e);
    return null;
  }
}

function normalizePlan(v: unknown): Plan | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  const squish = s.replace(/[\s_-]+/g, "");

  if (
    s === "trial" ||
    s === "monthly" ||
    s === "quarterly" ||
    s === "yearly" ||
    s === "strategic"
  )
    return s as Plan;

  if (squish === "yearlyfull" || s === "yearly_full") return "strategic";
  if (squish === "strategic365" || squish === "strategicyearly") return "strategic";

  if (s.includes("strategic")) return "strategic";

  return null;
}

/**
 * Map a raw plan field from DB/RPC (slug, label, etc.) to entitlements.
 * Use from server layouts when you have `public.plans.slug` but not persona RPC.
 */
export function deriveEntitlementsFromRawPlan(v: unknown): Entitlements {
  return deriveEntitlements(normalizePlan(v));
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
    /** Paid plans (incl. strategic 365-day) may persist snapshots to advisory_v2. */
    canSaveToServer: p !== "trial",
    canSeeVerdict: p !== "trial",
    canUseStressModel: p !== "trial",
    canSeeSolutions: flagship,
  };
}

/**
 * Strategic Execution card / module tier line (persona or `public.plans.slug`).
 * Trial → strategic upsell; paid non-`strategic` → upgrade; `strategic` → priority copy.
 */
export function strategicExecutionTierLabel(plan: Plan | null): string {
  const p = plan ?? "trial";
  if (p === "trial") return "Available with Strategic Access";
  if (p === "strategic") return "Priority access available";
  return "Upgrade to Strategic to unlock execution";
}

/** Same as {@link strategicExecutionTierLabel} after normalising a raw DB/RPC slug. */
export function strategicExecutionTierLabelFromRawPlan(raw: unknown): string {
  return strategicExecutionTierLabel(normalizePlan(raw));
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
 * After each save, keep the `max` newest reports per user + model (by created_at desc).
 * Deletes older rows so a new save effectively pushes out the oldest when over the limit.
 */
export async function trimReportsToLimit(
  supabase: SupabaseClient,
  userId: string,
  modelType: ModelType,
  max = 20
): Promise<void> {
  try {
    const { data: excess, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .select("id")
      .eq("user_id", userId)
      .eq("model_type", modelType)
      .order("created_at", { ascending: false })
      .range(max, 99999);
    if (error) {
      console.warn("[platformAccess] trimReportsToLimit select failed:", error.message);
      return;
    }
    if (!excess?.length) return;
    const ids = excess.map((r: { id: string }) => r.id);
    const { error: delErr } = await supabase
      .schema("advisory_v2")
      .from("advisory_reports")
      .delete()
      .in("id", ids);
    if (delErr) console.warn("[platformAccess] trimReportsToLimit delete failed:", delErr.message);
  } catch (e) {
    console.warn("[platformAccess] trimReportsToLimit error:", e);
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
    await trimReportsToLimit(supabase, params.userId, params.modelType, 20);
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
