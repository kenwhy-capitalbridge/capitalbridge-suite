/**
 * Smart /access email-first flow: existence + email confirmation from auth.users.
 * Primary: public.email_access_state(p_email) (SECURITY DEFINER, anon-granted).
 * Fallback: public.email_exists(p_email) when email_access_state is missing or errors
 * (e.g. migration not applied yet on production).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { emailExists } from "./emailCheck";

export type EmailAccessStateResult = "unknown" | "unconfirmed" | "active";

type RpcRow = {
  exists?: boolean;
  email_confirmed?: boolean | null;
};

const isDevOrPreview =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENV === "staging");

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

  if (!error) {
    const row = data as RpcRow | null;
    if (!row || row.exists !== true) {
      return { state: "unknown" };
    }
    if (row.email_confirmed !== true) {
      return { state: "unconfirmed" };
    }
    return { state: "active" };
  }

  if (isDevOrPreview) {
    console.warn(
      "[emailAccessState] email_access_state RPC failed; falling back to email_exists:",
      error.message
    );
  }

  const exists = await emailExists(supabase, trimmed);
  if (exists) {
    return { state: "active" };
  }

  // No row in auth (per email_exists) — same as primary path when exists is false
  return { state: "unknown" };
}
