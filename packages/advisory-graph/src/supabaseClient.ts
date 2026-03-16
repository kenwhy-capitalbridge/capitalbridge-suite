/**
 * Single browser Supabase client for the suite.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Schema is chosen per call (e.g. .schema('public').from(...)).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "" : "";
const anon = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" : "";
const envLabel = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_ENV ?? "" : "";

let logged = false;
function logOnce() {
  if (logged || typeof window === "undefined") return;
  const ref = url ? url.replace(/^https?:\/\//, "").split(".")[0] ?? "" : "";
  console.info(`Live Test Mode: project=${ref}, env=${envLabel || "unknown"}`);
  logged = true;
}

/**
 * Create a Supabase client for browser usage. No server keys.
 * Call .schema('public') or .schema('advisory_v2') at call site as needed.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (typeof window !== "undefined") logOnce();
  const u = url || "https://placeholder.supabase.co";
  const k = anon || "placeholder-key";
  return createClient(u, k, { auth: { persistSession: true } });
}
