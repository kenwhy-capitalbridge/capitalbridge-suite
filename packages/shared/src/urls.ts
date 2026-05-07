function envUrl(value: string | undefined, fallback: string): string {
  const t = value?.trim();
  return t && t.length > 0 ? t : fallback;
}

export const LOGIN_APP_URL = envUrl(
  process.env.NEXT_PUBLIC_LOGIN_APP_URL,
  "https://login.thecapitalbridge.com",
);

export const PLATFORM_APP_URL = envUrl(
  process.env.NEXT_PUBLIC_PLATFORM_APP_URL,
  "https://platform.thecapitalbridge.com",
);

/**
 * Optional preview platform URL used by model-app previews so Settings opens
 * the preview Platform app instead of production (e.g. https://advisoryplatform-<id>.vercel.app).
 */
export const PLATFORM_PREVIEW_APP_URL = process.env.NEXT_PUBLIC_PLATFORM_PREVIEW_APP_URL?.trim() ?? "";

function isVercelPreviewHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  return hostname.trim().toLowerCase().endsWith(".vercel.app");
}

export function platformSettingsBaseUrlForHost(currentHostname?: string | null): string {
  if (isVercelPreviewHost(currentHostname)) {
    return envUrl(PLATFORM_PREVIEW_APP_URL, PLATFORM_APP_URL);
  }
  return PLATFORM_APP_URL;
}

export function platformSettingsUrlForHost(currentHostname?: string | null): string {
  const base = platformSettingsBaseUrlForHost(currentHostname).replace(/\/+$/, "");
  return `${base}/settings`;
}

/**
 * Platform route that syncs `user_active_session` to the current JWT, then redirects.
 * Use as the model-app BACK target so middleware does not treat the slot as stale and sign out.
 */
export function platformBackThroughSessionSyncUrl(nextPath: string = "/"): string {
  const base = PLATFORM_APP_URL.replace(/\/+$/, "");
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && nextPath.length <= 512
      ? nextPath
      : "/";
  return `${base}/api/sync-user-active-session?next=${encodeURIComponent(next)}`;
}

export const API_APP_URL = envUrl(
  process.env.NEXT_PUBLIC_API_APP_URL,
  "https://api.thecapitalbridge.com",
);

/** Main marketing site (advisory, public pages) */
export const MARKETING_SITE_URL = envUrl(
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL,
  "https://thecapitalbridge.com",
);

/** Query key on login `/pricing` — allowlisted slug selects which model app dashboard BACK uses. */
export const PRICING_RETURN_MODEL_QUERY = "model" as const;

export type PricingReturnModelSlug =
  | "forever"
  | "incomeengineering"
  | "capitalhealth"
  | "capitalstress";

const PRICING_MODEL_DEFAULT_ORIGINS: Record<PricingReturnModelSlug, string> = {
  forever: "https://forever.thecapitalbridge.com",
  incomeengineering: "https://incomeengineering.thecapitalbridge.com",
  capitalhealth: "https://capitalhealth.thecapitalbridge.com",
  capitalstress: "https://capitalstress.thecapitalbridge.com",
};

export function isPricingReturnModelSlug(value: string): value is PricingReturnModelSlug {
  return (
    value === "forever" ||
    value === "incomeengineering" ||
    value === "capitalhealth" ||
    value === "capitalstress"
  );
}

/** Resolved `/dashboard` URL for a model slug, or `null` if slug is not allowlisted. */
export function pricingReturnModelDashboardUrl(slug: string): string | null {
  if (!isPricingReturnModelSlug(slug)) return null;
  const env =
    slug === "forever"
      ? process.env.NEXT_PUBLIC_FOREVER_APP_URL
      : slug === "incomeengineering"
        ? process.env.NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL
        : slug === "capitalhealth"
          ? process.env.NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL
          : process.env.NEXT_PUBLIC_CAPITAL_STRESS_APP_URL;
  const base = envUrl(env, PRICING_MODEL_DEFAULT_ORIGINS[slug]).replace(/\/+$/, "");
  return `${base}/dashboard`;
}

/** Merge `model=` into a login-app pricing URL (absolute or relative), preserving other query params. */
export function withPricingReturnModel(
  pricingUrl: string,
  slug: PricingReturnModelSlug,
): string {
  try {
    const u = new URL(pricingUrl);
    u.searchParams.set(PRICING_RETURN_MODEL_QUERY, slug);
    return u.toString();
  } catch {
    const sep = pricingUrl.includes("?") ? "&" : "?";
    return `${pricingUrl}${sep}${PRICING_RETURN_MODEL_QUERY}=${slug}`;
  }
}

/** After platform logout: stay on platform with scroll-to-text (Framework area). */
export function platformPostLogoutUrl(): string {
  const base = PLATFORM_APP_URL.replace(/\/+$/, "");
  return `${base}/#:~:text=FRAMEWORK-,LOGOUT,-CAPITAL%20BRIDGE%20ADVISORY`;
}

const FOREVER_APP_DEFAULT_ORIGIN = "https://forever.thecapitalbridge.com";

/** Forever app origin without trailing slash (uses `NEXT_PUBLIC_FOREVER_APP_URL` when set). */
export function foreverAppBaseUrl(): string {
  return envUrl(process.env.NEXT_PUBLIC_FOREVER_APP_URL, FOREVER_APP_DEFAULT_ORIGIN).replace(/\/+$/, "");
}

/** Canonical `/dashboard` URL for Forever (login redirects, gate). */
export function foreverDashboardUrl(): string {
  return `${foreverAppBaseUrl()}/dashboard`;
}

