import { suiteWideAuthCookieDomain } from "./suiteAuthCookieDomain";

/**
 * Merge Supabase auth cookie options with suite-wide settings in production so
 * sessions survive navigation across *.thecapitalbridge.com (login, platform, models),
 * unless `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host` (staging / isolated hosts).
 * Middleware must use the same domain as `createAppServerClient`; otherwise refreshed
 * tokens can be stored host-only on one subdomain and “vanish” on another.
 */
export type AuthCookieOptions = Record<string, unknown>;

export function withSuiteAuthCookieOptions(options?: AuthCookieOptions): AuthCookieOptions {
  const domain = suiteWideAuthCookieDomain();
  if (!domain) {
    return options ?? {};
  }
  return {
    ...(options ?? {}),
    domain,
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
