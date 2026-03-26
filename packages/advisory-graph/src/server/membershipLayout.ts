import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveEntitlementsFromRawPlan } from "../platformAccess";
import { tryServiceClient } from "./requestContext";

/** Active paid membership → server-side `canSaveToServer` (same logic as Forever layout). */
export async function serverCanSaveFromMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .schema("public")
    .from("memberships")
    .select("plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(1)
    .maybeSingle();
  if (!membership?.plan_id) return false;
  const { data: plan } = await supabase
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();
  return deriveEntitlementsFromRawPlan(plan?.slug ?? null).canSaveToServer;
}

/** Server-side session row so the header has a session id without relying on client-only creation. */
export async function createAdvisorySessionOnServer(
  authSupabase: SupabaseClient,
  userId: string,
  logTag: string
): Promise<string | null> {
  const db = tryServiceClient() ?? authSupabase;
  const { data, error } = await db
    .schema("advisory_v2")
    .from("advisory_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) {
    console.error(`${logTag} advisory_sessions:`, error.message);
    return null;
  }
  return data?.id ? String(data.id) : null;
}
