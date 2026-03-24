import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns whether the user has an active membership (public.memberships only).
 */
export async function hasActiveMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: row } = await supabase
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return !!row?.id;
}
