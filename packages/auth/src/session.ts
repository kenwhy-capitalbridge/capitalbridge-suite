import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ValidateSessionResult =
  | { valid: true; userId: string }
  | { valid: false; reason: "no_user" | "no_session" };

export type ValidateSessionOptions = Record<string, never>;

/**
 * Validates the request using Supabase Auth only (JWT / cookies). No app-side session table.
 */
export async function validateSession(
  supabase: SupabaseClient,
  _request: Request,
  _options: ValidateSessionOptions = {}
): Promise<ValidateSessionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { valid: false, reason: "no_user" };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    return { valid: false, reason: "no_session" };
  }

  return { valid: true, userId: user.id };
}
