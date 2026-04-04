/**
 * Edge middleware verification for the admin gate cookie (Web Crypto only).
 * Must match `platformAdminGate.server.ts` sign/verify bytes-for-byte.
 */

import {
  CB_PLATFORM_ADMIN_GATE_COOKIE,
  getAdminGateKeyMaterial,
  isAdminPasswordGateEnabled,
} from "./platformAdminGateShared";

export type AdminGatePayload = { uid: string; email: string; exp: number };

function base64UrlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function verifyAdminGateCookieValueEdge(
  token: string | undefined | null,
): Promise<AdminGatePayload | null> {
  if (!token || !isAdminPasswordGateEnabled()) return null;
  const material = getAdminGateKeyMaterial();
  if (!material) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const bodyB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  let bodyBytes: Uint8Array;
  let sig: Uint8Array;
  try {
    bodyBytes = base64UrlToBytes(bodyB64);
    sig = base64UrlToBytes(sigB64);
  } catch {
    return null;
  }
  const enc = new TextEncoder();
  const keyRaw = await crypto.subtle.digest("SHA-256", enc.encode(material));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    new Uint8Array(sig),
    new Uint8Array(bodyBytes),
  );
  if (!ok) return null;
  let parsed: AdminGatePayload;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as AdminGatePayload;
  } catch {
    return null;
  }
  if (
    typeof parsed.uid !== "string" ||
    typeof parsed.email !== "string" ||
    typeof parsed.exp !== "number"
  ) {
    return null;
  }
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

export function getAdminGateCookieFromHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const prefix = `${CB_PLATFORM_ADMIN_GATE_COOKIE}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      try {
        return decodeURIComponent(p.slice(prefix.length));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
