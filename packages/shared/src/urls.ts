export const LOGIN_APP_URL =
  process.env.NEXT_PUBLIC_LOGIN_APP_URL ?? "https://login.thecapitalbridge.com";

export const PLATFORM_APP_URL =
  process.env.NEXT_PUBLIC_PLATFORM_APP_URL ?? "https://platform.thecapitalbridge.com";

export const API_APP_URL =
  process.env.NEXT_PUBLIC_API_APP_URL ?? "https://api.thecapitalbridge.com";

/** Main marketing site (advisory, public pages) */
export const MARKETING_SITE_URL =
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

/** After platform logout: stay on platform with scroll-to-text (Framework area). */
export function platformPostLogoutUrl(): string {
  const base = PLATFORM_APP_URL.replace(/\/+$/, "");
  return `${base}/#:~:text=FRAMEWORK-,LOGOUT,-CAPITAL%20BRIDGE%20ADVISORY`;
}

