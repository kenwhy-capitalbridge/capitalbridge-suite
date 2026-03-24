/**
 * Foundation for admin recovery actions (no UI). Call from future admin routes only.
 * All operations use service role; verify caller server-side.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePaidMembershipForUser } from "@cb/membership/activateFromBillingSession";

export type AdminRecoveryDeps = {
  svc: SupabaseClient;
};

/** Clear user_active_session row for a user (single-session slot). */
export async function adminClearUserSession(deps: AdminRecoveryDeps, userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await deps.svc.schema("public").from("user_active_session").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Re-run membership ensure from latest paid billing session (idempotent). */
export async function adminRetriggerMembershipCreation(
  deps: AdminRecoveryDeps,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const r = await ensurePaidMembershipForUser(deps.svc, userId);
  if (!r.ok) return { ok: false, error: r.errors.join(", ") };
  return { ok: true };
}

/** Placeholder: wire to your email provider / Supabase admin API when admin UI exists. */
export async function adminResendAccessEmail(_deps: AdminRecoveryDeps, _userId: string): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "not_implemented" };
}
