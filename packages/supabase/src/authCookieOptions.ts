/**
 * Merge Supabase auth cookie options with suite-wide settings in production so
 * sessions survive navigation across *.thecapitalbridge.com (login, platform, models).
 * Middleware must use the same domain as `createAppServerClient`; otherwise refreshed
 * tokens can be stored host-only on one subdomain and “vanish” on another.
 */
export type AuthCookieOptions = Record<string, unknown>;

export function withSuiteAuthCookieOptions(options?: AuthCookieOptions): AuthCookieOptions {
  if (process.env.NODE_ENV !== "production") {
    return options ?? {};
  }
  return {
    ...(options ?? {}),
    domain: ".thecapitalbridge.com",
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
