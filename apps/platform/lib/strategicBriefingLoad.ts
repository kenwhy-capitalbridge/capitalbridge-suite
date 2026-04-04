import type { createServiceClient } from "@cb/supabase/service";
import type { Database } from "@cb/db-types/database";

type Svc = ReturnType<typeof createServiceClient>;

type AdvisoryReportRow = Database["advisory_v2"]["Tables"]["advisory_reports"]["Row"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_USERS = 40;
const MAX_REPORT_ROWS = 400;

export type StrategicBriefingUser = {
  user_id: string;
  display_name: string;
  profile_email: string;
  strategic_interests: Database["public"]["Tables"]["strategic_interest"]["Row"][];
  /** Newest row per model_type for this user (from advisory_v2). */
  latest_reports_by_model: Record<string, AdvisoryReportRow>;
  /** Row from advisory_reports where id::text = strategic_interest.report_id, if any. */
  linked_reports: Partial<Record<string, AdvisoryReportRow | null>>;
};

function parseUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (UUID_RE.test(s)) out.push(s);
  }
  return [...new Set(out)].slice(0, MAX_USERS);
}

export function parseUserIdsFromText(text: string): string[] {
  const parts = text
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts.filter((s) => UUID_RE.test(s)))].slice(0, MAX_USERS);
}

/** Accepts POST JSON `{ "userIds": ["uuid", ...] }`. */
export function parseUserIdsFromRequestBody(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const userIds = (body as { userIds?: unknown }).userIds;
  return parseUserIds(userIds);
}

/**
 * Load strategic_interest rows + latest advisory_v2 snapshots for a set of users.
 * Uses service role (admin API only).
 */
export async function loadStrategicBriefingForUserIds(
  svc: Svc,
  userIds: string[],
): Promise<{ briefings: StrategicBriefingUser[]; error: string | null }> {
  const ids = [...new Set(userIds.filter((id) => UUID_RE.test(id)))].slice(0, MAX_USERS);
  if (ids.length === 0) {
    return { briefings: [], error: null };
  }

  const { data: profiles, error: pErr } = await svc
    .schema("public")
    .from("profiles")
    .select("id,first_name,last_name,email")
    .in("id", ids);

  if (pErr) {
    return { briefings: [], error: pErr.message };
  }

  const { data: interests, error: siErr } = await svc
    .schema("public")
    .from("strategic_interest")
    .select("*")
    .in("user_id", ids)
    .order("created_at", { ascending: false });

  if (siErr) {
    return { briefings: [], error: siErr.message };
  }

  const { data: reports, error: rErr } = await svc
    .schema("advisory_v2")
    .from("advisory_reports")
    .select("id, user_id, session_id, model_type, inputs, results, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);

  if (rErr) {
    return { briefings: [], error: rErr.message };
  }

  const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const interestsByUser = new Map<string, Database["public"]["Tables"]["strategic_interest"]["Row"][]>();
  for (const row of interests ?? []) {
    const list = interestsByUser.get(row.user_id) ?? [];
    list.push(row);
    interestsByUser.set(row.user_id, list);
  }

  const latestByUserModel = new Map<string, AdvisoryReportRow>();
  for (const r of reports ?? []) {
    const key = `${r.user_id}::${r.model_type}`;
    if (!latestByUserModel.has(key)) {
      latestByUserModel.set(key, r);
    }
  }

  const reportById = new Map<string, AdvisoryReportRow>();
  for (const r of reports ?? []) {
    reportById.set(r.id, r);
  }

  const briefings: StrategicBriefingUser[] = ids.map((user_id) => {
    const p = profileById[user_id];
    const display_name =
      [p?.first_name?.trim(), p?.last_name?.trim()].filter(Boolean).join(" ") ||
      p?.email?.trim() ||
      user_id;
    const profile_email = p?.email?.trim() ?? "—";

    const userInterests = interestsByUser.get(user_id) ?? [];
    const latest_reports_by_model: Record<string, AdvisoryReportRow> = {};
    for (const [key, row] of latestByUserModel) {
      if (key.startsWith(`${user_id}::`)) {
        latest_reports_by_model[row.model_type] = row;
      }
    }

    const linked_reports: Partial<Record<string, AdvisoryReportRow | null>> = {};
    for (const si of userInterests) {
      const rid = si.report_id?.trim();
      if (!rid) continue;
      if (!(rid in linked_reports)) {
        linked_reports[rid] = reportById.get(rid) ?? null;
      }
    }

    return {
      user_id,
      display_name,
      profile_email,
      strategic_interests: userInterests,
      latest_reports_by_model,
      linked_reports,
    };
  });

  return { briefings, error: null };
}
