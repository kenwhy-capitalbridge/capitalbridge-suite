import "server-only";

import { createServiceClient } from "@cb/supabase/service";
import { getJwtSessionIdFromAccessToken } from "@cb/shared/sessionFingerprint";

/**
 * Aligns `public.user_active_session` with the current Supabase JWT so platform
 * middleware does not treat the session as stale and call `signOut` when the user
 * navigates from a model app (Back → platform). Matches login `complete-login`
 * persistence; model apps previously only verified `getUser()` and never updated
 * the slot.
 */
export async function syncUserActiveSessionFromAccessToken(
  userId: string,
  accessToken: string | null | undefined,
  logTag: string
): Promise<void> {
  if (!userId || !accessToken) return;

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch {
    return;
  }

  const jwtSessionId = getJwtSessionIdFromAccessToken(accessToken);
  const nowIso = new Date().toISOString();

  if (!jwtSessionId) {
    const { error } = await svc.schema("public").from("user_active_session").delete().eq("user_id", userId);
    if (error) console.warn(`${logTag} user_active_session delete (no jwt session_id)`, error.message);
    return;
  }

  const { data: updatedRows, error: upErr } = await svc
    .schema("public")
    .from("user_active_session")
    .update({ session_id: jwtSessionId, updated_at: nowIso })
    .eq("user_id", userId)
    .select("user_id");

  if (upErr) {
    console.warn(`${logTag} user_active_session update`, upErr.message);
    return;
  }

  if (updatedRows && updatedRows.length > 0) return;

  const { error: insErr } = await svc.schema("public").from("user_active_session").insert({
    user_id: userId,
    session_id: jwtSessionId,
    updated_at: nowIso,
  });
  if (!insErr) return;

  const { data: late, error: up2 } = await svc
    .schema("public")
    .from("user_active_session")
    .update({ session_id: jwtSessionId, updated_at: nowIso })
    .eq("user_id", userId)
    .select("user_id");
  if (up2) console.warn(`${logTag} user_active_session insert retry`, up2.message);
  else if (!late?.length) console.warn(`${logTag} user_active_session insert`, insErr.message);
}
