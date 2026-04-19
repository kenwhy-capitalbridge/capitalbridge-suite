/**
 * Staging deployment helpers (Capital Bridge platform).
 * Gate + UI use **hostname only** so production is never toggled by env flags alone.
 *
 * Optional `NEXT_PUBLIC_APP_URL` may define the staging canonical origin; its hostname
 * is used only if it is not a known production app host (safety guard).
 */

/** Hosts that must never be treated as staging via `NEXT_PUBLIC_APP_URL` misconfiguration. */
const DISALLOWED_AS_STAGING_HOST = new Set(
  [
    "platform.thecapitalbridge.com",
    "login.thecapitalbridge.com",
    "api.thecapitalbridge.com",
    "thecapitalbridge.com",
    "www.thecapitalbridge.com",
    "forever.thecapitalbridge.com",
    "incomeengineering.thecapitalbridge.com",
    "capitalhealth.thecapitalbridge.com",
    "capitalstress.thecapitalbridge.com",
  ].map((h) => h.toLowerCase()),
);

export function normalizeRequestHost(hostHeader: string | null): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Resolved staging hostname for gate + banner (default `staging.thecapitalbridge.com`).
 * Order: `NEXT_PUBLIC_APP_URL` hostname (if safe) → `NEXT_PUBLIC_CB_STAGING_HOSTNAME` → default.
 */
export function getStagingCapitalBridgeHostname(): string {
  const fromAppUrl = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.trim()) || "";
  if (fromAppUrl) {
    try {
      const h = new URL(fromAppUrl).hostname.toLowerCase();
      if (h && !DISALLOWED_AS_STAGING_HOST.has(h)) {
        return h;
      }
    } catch {
      /* ignore invalid URL */
    }
  }
  const override = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CB_STAGING_HOSTNAME?.trim()) || "";
  if (override) return override.toLowerCase();
  return "staging.thecapitalbridge.com";
}

/** True when request host is the configured staging hostname (Preview / custom domain). */
export function isStagingCapitalBridgeHost(host: string): boolean {
  if (!host) return false;
  return host === getStagingCapitalBridgeHostname();
}

/** Alias — same as {@link isStagingCapitalBridgeHost}. */
export const isStagingHost = isStagingCapitalBridgeHost;

/**
 * Coarse deployment label for logging / UI hints. Staging is detected **by host only**
 * so `NEXT_PUBLIC_APP_ENV=staging` alone cannot mark production traffic as staging.
 */
export function getAppEnv(hostHeader: string | null): "development" | "staging" | "production" {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    return "development";
  }
  const host = normalizeRequestHost(hostHeader);
  if (isStagingCapitalBridgeHost(host)) return "staging";
  return "production";
}

export const STAGING_GATE_COOKIE_NAME = "cb_staging_gate";

/** Paths that bypass the staging access gate (middleware + layout). */
export function isStagingGateExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/__nextjs")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname === "/staging-access" || pathname.startsWith("/staging-access/")) return true;
  if (pathname.startsWith("/api/staging-gate/")) return true;
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|txt|xml|json|woff2?)$/i.test(pathname)) return true;
  return false;
}

function stagingGateSigningSecret(): string {
  const s =
    (typeof process !== "undefined" && process.env.STAGING_GATE_SIGNING_SECRET?.trim()) ||
    (typeof process !== "undefined" && process.env.STAGING_GATE_PASSWORD?.trim()) ||
    "";
  return s;
}

function toHex(u8: Uint8Array): string {
  return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(new Uint8Array(sig));
}

/** Signed cookie value: `<expUnix>.<hexHmac>` */
export async function mintStagingGateCookieValue(ttlSec: number): Promise<string | null> {
  const secret = stagingGateSigningSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await hmacSha256Hex(secret, String(exp));
  return `${exp}.${sig}`;
}

export async function verifyStagingGateCookieValue(raw: string | undefined | null): Promise<boolean> {
  const secret = stagingGateSigningSecret();
  if (!secret || !raw) return false;
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const expStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacSha256Hex(secret, expStr);
  return timingSafeEqualHex(expected, sig);
}
