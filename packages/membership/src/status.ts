import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns whether the user has an active membership.
 * Uses active_memberships view if available, otherwise memberships table.
 */
export async function hasActiveMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: viewRows } = await supabase
    .schema("public")
    .from("active_memberships")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1);

  if (Array.isArray(viewRows) && viewRows.length > 0) {
    return true;
  }

  const now = new Date().toISOString();
  const { data: membershipRows } = await supabase
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(1);

  return Array.isArray(membershipRows) && membershipRows.length > 0;
}
