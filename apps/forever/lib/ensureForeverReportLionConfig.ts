import { createAppServerClient } from "@cb/supabase/server";
import { LION_COPY, type Tier } from "@cb/lion-verdict/copy";

import { isLionConfigChosen } from "./lionConfigChosen";

type AppSupabase = Awaited<ReturnType<typeof createAppServerClient>>;

const LION_SOURCE_LABEL = "Lion Verdict dynamic copy.txt";
const EXPORT_VARIANT = "paid_v6";
const HISTORY_LIMIT = 5;

function hashExportIdSalt(exportId: string): number {
  let h = 0;
  for (let i = 0; i < exportId.length; i += 1) {
    h = (h * 31 + exportId.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function extractRecentPairs(rows: { lion_config: unknown }[]): { hi: number; gi: number }[] {
  const out: { hi: number; gi: number }[] = [];
  for (const row of rows) {
    const c = row.lion_config;
    if (!c || typeof c !== "object" || Array.isArray(c)) continue;
    const o = c as Record<string, unknown>;
    const hi = o.headlineIndex;
    const gi = o.guidanceIndex;
    if (typeof hi === "number" && Number.isInteger(hi) && typeof gi === "number" && Number.isInteger(gi)) {
      out.push({ hi, gi });
    }
  }
  return out;
}

function pickAntiRepeatIndices(args: {
  tier: Tier;
  exportId: string;
  recentPairs: { hi: number; gi: number }[];
}): { headlineIndex: number; guidanceIndex: number } {
  const bucket = LION_COPY[args.tier];
  const hLen = bucket.headlines.length;
  const gLen = bucket.guidance.length;
  const last = args.recentPairs[0];
  const banned = new Set(args.recentPairs.map((p) => `${p.hi},${p.gi}`));
  const salt = hashExportIdSalt(args.exportId);

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const hi = (salt + attempt * 17) % hLen;
    const gi = (salt + attempt * 23) % gLen;
    if (last && hi === last.hi && gi === last.gi) continue;
    const key = `${hi},${gi}`;
    if (banned.has(key) && attempt < 80) continue;
    return { headlineIndex: hi, guidanceIndex: gi };
  }

  return { headlineIndex: 0, guidanceIndex: 0 };
}

export type EnsureLionResult =
  | { ok: true; skipped: "trial"; lion_config: null }
  | { ok: true; lion_config: Record<string, unknown> };

/**
 * Paid: ensure verbatim Lion lines are chosen, anti-repeat vs recent exports, persisted on the row.
 * Trial: no-op (does not write lion selections).
 */
export async function ensureForeverReportLionConfig(
  supabase: AppSupabase,
  args: { userId: string; exportId: string; verdictTier: Tier },
): Promise<EnsureLionResult> {
  const { data: row, error: selErr } = await supabase
    .from("report_exports")
    .select("id, user_id, tier, lion_config, report_id")
    .eq("id", args.exportId)
    .maybeSingle();

  if (selErr || !row || row.user_id !== args.userId) {
    throw Object.assign(new Error("forbidden_or_missing"), { status: 403 });
  }

  const isTrial = String(row.tier ?? "").toLowerCase().trim() === "trial";
  if (isTrial) {
    return { ok: true, skipped: "trial", lion_config: null };
  }

  const existing = row.lion_config as unknown;
  if (isLionConfigChosen(existing)) {
    return { ok: true, lion_config: existing as Record<string, unknown> };
  }

  const prevBase =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  const { data: history, error: histErr } = await supabase
    .from("report_exports")
    .select("lion_config, created_at")
    .eq("user_id", args.userId)
    .neq("id", args.exportId)
    .like("report_id", "CB-FOREVER-%")
    .neq("tier", "trial")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (histErr) {
    throw Object.assign(new Error(histErr.message), { status: 500 });
  }

  const recentPairs = extractRecentPairs(history ?? []);
  const { headlineIndex, guidanceIndex } = pickAntiRepeatIndices({
    tier: args.verdictTier,
    exportId: args.exportId,
    recentPairs,
  });

  const lines = LION_COPY[args.verdictTier];
  const headlineText = lines.headlines[headlineIndex]?.text ?? "";
  const guidanceText = lines.guidance[guidanceIndex]?.text ?? "";
  if (!headlineText.trim() || !guidanceText.trim()) {
    throw Object.assign(new Error("lion_index_out_of_range"), { status: 500 });
  }

  const selectedAt = new Date().toISOString();
  const next: Record<string, unknown> = {
    ...prevBase,
    verdictTier: args.verdictTier,
    headlineIndex,
    guidanceIndex,
    headlineText,
    guidanceText,
    source: LION_SOURCE_LABEL,
    exportVariant: EXPORT_VARIANT,
    selectedAt,
  };

  const { error: upErr } = await supabase
    .from("report_exports")
    .update({ lion_config: next })
    .eq("id", args.exportId)
    .eq("user_id", args.userId);

  if (upErr) {
    throw Object.assign(new Error(upErr.message), { status: 500 });
  }

  return { ok: true, lion_config: next };
}
