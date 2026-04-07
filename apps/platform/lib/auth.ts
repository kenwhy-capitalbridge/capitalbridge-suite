import { createAppServerClient } from "@cb/supabase/server";

export type ServerMembership = {
  user_id: string;
  plan: string | null;
  start_date: string | null;
  end_date: string | null;
} | null;

export async function getServerUser() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function getServerUserAndMembership(): Promise<{
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    advisory_market?: string | null;
    /** Campaign / event access (e.g. gitex_trial). */
    access_type?: string | null;
    campaign_source?: string | null;
    campaign_trial_ends_at?: string | null;
  } | null;
  membership: ServerMembership;
}> {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, membership: null };

    const { data: profile } = await supabase
      .schema("public")
      .from("profiles")
      .select("first_name, last_name, advisory_market, access_type, campaign_source, campaign_trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const { data: membership } = await supabase
      .schema("public")
      .from("memberships")
      .select("user_id, plan_id, start_date, end_date, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let planSlug: string | null = null;
    if (membership?.plan_id) {
      const { data: plan } = await supabase
        .schema("public")
        .from("plans")
        .select("slug")
        .eq("id", membership.plan_id)
        .maybeSingle();
      planSlug = plan?.slug ?? null;
    }

    const name =
      (user.user_metadata?.name as string | undefined)?.trim() ||
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      null;

    const firstName = profile?.first_name?.trim() || null;
    const lastName = profile?.last_name?.trim() || null;

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        name: name || null,
        firstName,
        lastName,
        advisory_market: typeof profile?.advisory_market === "string" ? profile.advisory_market : null,
        access_type: typeof profile?.access_type === "string" ? profile.access_type : null,
        campaign_source: typeof profile?.campaign_source === "string" ? profile.campaign_source : null,
        campaign_trial_ends_at:
          typeof profile?.campaign_trial_ends_at === "string" ? profile.campaign_trial_ends_at : null,
      },
      membership: membership
        ? {
            user_id: membership.user_id,
            plan: planSlug,
            start_date: membership.start_date,
            end_date: membership.end_date,
          }
        : null,
    };
  } catch {
    return { user: null, membership: null };
  }
}
