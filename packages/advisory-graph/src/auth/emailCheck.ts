/**
 * Email existence check for checkout pre-check. Calls public.email_exists(p_email).
 * Safe for anti-enum: returns boolean; on RPC error returns false and logs in dev/preview only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const isDevOrPreview =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENV === "staging");

/**
 * Returns true if an auth user exists with the given email (case-insensitive, trimmed).
 * Calls rpc('email_exists', { p_email }). On RPC error returns false and optionally logs.
 */
export async function emailExists(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!trimmed) return false;
  try {
    const { data, error } = await supabase.rpc("email_exists", { p_email: trimmed });
    if (error) {
      if (isDevOrPreview) {
        console.warn("[emailCheck] email_exists RPC error:", error.message);
      }
      return false;
    }
    return data === true;
  } catch (e) {
    if (isDevOrPreview) {
      console.warn("[emailCheck] email_exists error:", e);
    }
    return false;
  }
}
