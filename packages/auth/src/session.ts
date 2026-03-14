import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ValidateSessionResult =
  | { valid: true; userId: string }
  | {
      valid: false;
      reason:
        | "no_user"
        | "no_session_row"
        | "token_mismatch"
        | "ip_mismatch"
        | "user_agent_mismatch";
    };

export type ValidateSessionOptions = {
  strictIp?: boolean;
  strictUserAgent?: boolean;
};

/**
 * Validates the current request against public.user_sessions (token reuse protection).
 * Use in protected API routes or server logic to enforce one-session-per-account.
 */
export async function validateSession(
  supabase: SupabaseClient,
  request: Request,
  options: ValidateSessionOptions = {}
): Promise<ValidateSessionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { valid: false, reason: "no_user" };
  }

  const session = await supabase.auth.getSession();
  const currentToken = session.data.session?.access_token ?? null;
  if (!currentToken) {
    return { valid: false, reason: "no_user" };
  }

  const { data: row, error } = await supabase
    .from("user_sessions")
    .select("session_token, ip_address, user_agent")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return { valid: false, reason: "no_session_row" };
  }

  if (row.session_token !== currentToken) {
    return { valid: false, reason: "token_mismatch" };
  }

  if (options.strictIp) {
    const requestIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const storedIp = row.ip_address ?? null;
    if (requestIp !== null && storedIp !== null && requestIp !== storedIp) {
      return { valid: false, reason: "ip_mismatch" };
    }
  }

  if (options.strictUserAgent) {
    const requestUa = request.headers.get("user-agent") ?? null;
    const storedUa = row.user_agent ?? null;
    if (requestUa !== null && storedUa !== null && requestUa !== storedUa) {
      return { valid: false, reason: "user_agent_mismatch" };
    }
  }

  return { valid: true, userId: user.id };
}
