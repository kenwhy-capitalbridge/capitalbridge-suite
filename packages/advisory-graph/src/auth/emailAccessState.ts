/**
 * Smart /access email-first flow: existence + email confirmation from auth.users.
 * Calls public.email_access_state(p_email) (SECURITY DEFINER, anon-granted).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailAccessStateResult = "unknown" | "unconfirmed" | "active";

type RpcRow = {
  exists?: boolean;
  email_confirmed?: boolean | null;
};

export async function getEmailAccessState(
  supabase: SupabaseClient,
  email: string
): Promise<{ state: EmailAccessStateResult; rawError?: string }> {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { state: "unknown" };
  }

  const { data, error } = await supabase.rpc("email_access_state", {
    p_email: trimmed,
  });

  if (error) {
    return { state: "unknown", rawError: error.message };
  }

  const row = data as RpcRow | null;
  if (!row || row.exists !== true) {
    return { state: "unknown" };
  }
  if (row.email_confirmed !== true) {
    return { state: "unconfirmed" };
  }
  return { state: "active" };
}
