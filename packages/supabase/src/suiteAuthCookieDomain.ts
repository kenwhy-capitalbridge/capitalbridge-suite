/**
 * Supabase browser + SSR cookies: suite-wide `.thecapitalbridge.com` in production,
 * unless explicitly scoped to the current host (recommended for staging.thecapitalbridge.com).
 *
 * Set `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host` on a deployment to avoid writing auth
 * cookies on the parent domain (isolates sessions from other subdomains).
 */
export function suiteWideAuthCookieDomain(): string | undefined {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE === "host") {
    return undefined;
  }
  if (typeof process === "undefined" || process.env.NODE_ENV !== "production") {
    return undefined;
  }
  return ".thecapitalbridge.com";
}
