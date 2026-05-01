import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const PROBE_TTL_MS = 120_000;

let probeCache: { expiresAt: number; available: boolean } | null = null;

function isMissingCheckoutMetadataError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("checkout_metadata") &&
    (m.includes("schema cache") || m.includes("does not exist") || m.includes("could not find"))
  );
}

/**
 * PostgREST rejects unknown columns. If `checkout_metadata` was never migrated, omit it from
 * inserts/selects. Cache is short-lived so the API self-heals shortly after you run the migration.
 */
export async function billingSessionsCheckoutMetadataColumnAvailable(
  svc: SupabaseClient,
): Promise<boolean> {
  const now = Date.now();
  if (probeCache !== null && now < probeCache.expiresAt) {
    return probeCache.available;
  }

  const { error } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("checkout_metadata")
    .limit(0);

  let available: boolean;
  if (!error) {
    available = true;
  } else if (isMissingCheckoutMetadataError(error.message)) {
    available = false;
    console.warn(
      "[billing] billing_sessions.checkout_metadata is missing — run supabase migrations 20260411120000_billing_sessions_checkout_metadata.sql (or 20260502100000_ensure).",
    );
  } else {
    console.warn("[billing] checkout_metadata probe non-fatal:", error.message);
    available = true;
  }

  probeCache = { expiresAt: now + PROBE_TTL_MS, available };
  return available;
}

export function billingSessionSelectColumns(available: boolean): string {
  const base = "id, email, plan_id, status, user_id, membership_id";
  return available ? `${base}, checkout_metadata` : base;
}

/** Row shape for billing finalize paths that use `billingSessionSelectColumns()` (dynamic select string). */
export type BillingSessionFinalizeSelectRow = {
  id: string;
  email: string | null;
  plan_id: string;
  status: string;
  user_id: string | null;
  membership_id: string | null;
  checkout_metadata?: unknown;
};
