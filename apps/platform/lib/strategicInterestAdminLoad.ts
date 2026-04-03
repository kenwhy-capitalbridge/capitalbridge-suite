import type { createServiceClient } from "@cb/supabase/service";
import type { Database } from "@cb/db-types/database";

type Svc = ReturnType<typeof createServiceClient>;

export type StrategicInterestAdminRow = Database["public"]["Tables"]["strategic_interest"]["Row"] & {
  display_name: string;
  profile_email: string;
};

export async function loadStrategicInterestAdminRows(svc: Svc): Promise<{
  rows: StrategicInterestAdminRow[];
  error: string | null;
}> {
  const { data: rows, error } = await svc
    .schema("public")
    .from("strategic_interest")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  type ProfilePick = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  let profilesById: Record<string, ProfilePick> = {};
  if (userIds.length > 0) {
    const { data: profs, error: pErr } = await svc
      .schema("public")
      .from("profiles")
      .select("id,first_name,last_name,email")
      .in("id", userIds);
    if (pErr) {
      return { rows: [], error: pErr.message };
    }
    profilesById = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  }

  const enriched: StrategicInterestAdminRow[] = (rows ?? []).map((r) => {
    const p = profilesById[r.user_id];
    const name =
      [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(" ") ||
      p?.email?.trim() ||
      "—";
    return {
      ...r,
      display_name: name,
      profile_email: p?.email?.trim() ?? "—",
    };
  });

  return { rows: enriched, error: null };
}
