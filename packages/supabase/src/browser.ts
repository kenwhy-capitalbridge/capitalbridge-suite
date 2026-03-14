import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

/**
 * Browser client for Client Components in the login app.
 * Session cookies are managed by @supabase/ssr and shared via cookie domain in production.
 */
export function createAppBrowserClient() {
  // Avoid build-time crashes when env vars are not present locally.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Dedicated client for recovery flows. This uses implicit auth so password-reset
 * links continue to work even when the email link opens in a different browser
 * from the one that initiated the request.
 */
export function createRecoveryBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
    },
  });
}
