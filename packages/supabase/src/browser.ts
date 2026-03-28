import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

/** One client per tab across chunks / remounts; multiple clients each run `autoRefreshToken` and can 429 the token endpoint. */
const BROWSER_SINGLETON_KEY = "__cbAppBrowserSupabase_v1" as const;

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

/**
 * Browser client for Client Components in the login app.
 * Session cookies are managed by @supabase/ssr and shared via cookie domain in production.
 */
export function createAppBrowserClient(): SupabaseClient {
  // Avoid build-time crashes when env vars are not present locally.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY;
  /**
   * Important: to share sessions across subdomains (login + platform), the browser
   * must set cookies on `.thecapitalbridge.com` in production. Otherwise the user
   * can be “signed in” on login.* but appear signed out on platform.*.
   */
  const cookieOptions =
    process.env.NODE_ENV === "production"
      ? { domain: ".thecapitalbridge.com", path: "/", sameSite: "lax" as const, secure: true }
      : undefined;
  const opts = cookieOptions ? { cookieOptions } : undefined;

  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, SupabaseClient | undefined>;
    const existing = w[BROWSER_SINGLETON_KEY];
    if (existing) return existing;
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, opts);
    w[BROWSER_SINGLETON_KEY] = client;
    return client;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, opts);
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
