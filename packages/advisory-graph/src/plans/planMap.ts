/**
 * In-memory cache of plan id/slug → duration_days from public.plans.
 * TTL 60 minutes; reduces round-trips when computing expires_at.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanDurations = { [planIdOrName: string]: number };

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

let cache: PlanDurations = {};
let cacheTimestamp = 0;

const isDevOrPreview =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENV === "staging");

function isStale(): boolean {
  return Date.now() - cacheTimestamp > CACHE_TTL_MS;
}

/**
 * Loads all plans from public.plans and builds a map of id/slug → duration_days.
 * Uses cache if fresh; on fetch failure keeps current cache and returns.
 */
export async function loadPlanMap(supabase: SupabaseClient): Promise<PlanDurations> {
  if (!isStale() && Object.keys(cache).length > 0) {
    return cache;
  }
  try {
    const { data, error } = await supabase
      .schema("public")
      .from("plans")
      .select("id, slug, duration_days");

    if (error) {
      if (isDevOrPreview) {
        console.warn("[planMap] loadPlanMap failed:", error.message);
      }
      return cache;
    }

    const next: PlanDurations = {};
    for (const row of data ?? []) {
      const id = row?.id;
      const slug = row?.slug;
      const days = row?.duration_days != null ? Math.floor(Number(row.duration_days)) : undefined;
      if (days != null && days >= 0) {
        if (id) next[String(id)] = days;
        if (slug) next[String(slug)] = days;
      }
    }
    cache = next;
    cacheTimestamp = Date.now();
    if (isDevOrPreview) {
      console.info("planMap: loaded", Object.keys(cache).length, "plans");
    }
    return cache;
  } catch (e) {
    if (isDevOrPreview) {
      console.warn("[planMap] loadPlanMap error:", e);
    }
    return cache;
  }
}

/**
 * Returns cached duration_days for plan id or slug, or fallback if not in cache.
 */
export function getPlanDuration(planIdOrName: string, fallbackDays?: number): number {
  const key = String(planIdOrName).trim();
  if (key && cache[key] != null) return cache[key];
  return fallbackDays != null ? Math.floor(fallbackDays) : 7;
}

/**
 * Clears cache and forces next loadPlanMap to refetch.
 */
export async function refreshPlanMap(supabase: SupabaseClient): Promise<void> {
  cache = {};
  cacheTimestamp = 0;
  await loadPlanMap(supabase);
}
