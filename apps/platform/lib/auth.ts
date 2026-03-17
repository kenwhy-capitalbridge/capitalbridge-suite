import { createAppServerClient } from "@cb/supabase/server";
import type { Database } from "@cb/db-types/database";

export type Membership = Database["public"]["Tables"]["active_memberships"]["Row"] | null;

export async function getServerUser() {
  try {
    const supabase = await createAppServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function getServerUserAndMembership(): Promise<{
  user: { id: string; email?: string | null; name?: string | null } | null;
  membership: Membership;
}> {
  try {
    const supabase = await createAppServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, membership: null };

    const { data: membership } = await supabase
      .schema("public")
      .from("active_memberships")
      .select("user_id, plan, start_date, end_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const name =
      (user.user_metadata?.name as string | undefined)?.trim() ||
      null;

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        name: name || null,
      },
      membership: (membership as Membership) ?? null,
    };
  } catch {
    return { user: null, membership: null };
  }
}

