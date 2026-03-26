import "server-only";

import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Service-role client when `SUPABASE_SERVICE_ROLE_KEY` is set; otherwise null. */
export function tryServiceClient(): SupabaseClient | null {
  try {
    return createServiceClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[advisory] service client unavailable, using user JWT (RLS may block):", msg);
    return null;
  }
}

/**
 * Verified user (cookie session) + DB client for advisory_v2.
 * Prefer service role for data so RLS on `advisory_v2` does not block saves/lists.
 * All queries must still filter by this `user.id`.
 */
export async function getAdvisoryRequestContext(): Promise<{
  user: { id: string; email?: string | null };
  db: SupabaseClient;
}> {
  const auth = await createAppServerClient();
  const {
    data: { user },
    error,
  } = await auth.auth.getUser();
  if (error || !user) {
    throw new Error("unauthorized");
  }
  const db = tryServiceClient() ?? auth;
  return { user, db };
}
