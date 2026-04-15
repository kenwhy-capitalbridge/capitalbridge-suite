import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived HMAC token so Playwright can open `/dashboard/*-report-document/[id]`
 * without replaying browser cookies (Supabase cookies use Domain=.thecapitalbridge.com;
 * Playwright `addCookies({ url })` is unreliable for those).
 *
 * Callers must pass `secret` read from the app layer (`process.env` in Route Handlers / Server Components).
 * Do not read `process.env` inside this module — Next.js can bundle workspace packages such that
 * `process.env.SUPABASE_SERVICE_ROLE_KEY` becomes undefined at build time.
 */
export type PdfCapturePayload = {
  v: 1;
  exportId: string;
  userId: string;
  exp: number;
};

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** Default TTL for one PDF capture navigation (seconds). */
const DEFAULT_TTL_SEC = 600;

/**
 * @param secret Prefer `process.env.REPORT_PDF_CAPTURE_SECRET` or `process.env.SUPABASE_SERVICE_ROLE_KEY` from the caller.
 */
export function signPdfCaptureToken(
  args: { exportId: string; userId: string; ttlSec?: number },
  secret: string,
): string {
  const s = secret.trim();
  if (!s) {
    throw new Error("signPdfCaptureToken: secret is empty");
  }
  const exp = Math.floor(Date.now() / 1000) + (args.ttlSec ?? DEFAULT_TTL_SEC);
  const payload: PdfCapturePayload = { v: 1, exportId: args.exportId, userId: args.userId, exp };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64url(Buffer.from(payloadStr, "utf8"));
  const sig = createHmac("sha256", s).update(payloadB64).digest();
  const sigB64 = b64url(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyPdfCaptureToken(
  token: string,
  expectedExportId: string,
  secret: string,
): PdfCapturePayload | null {
  const s = secret.trim();
  if (!s) return null;
  const trimmed = token.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = trimmed.slice(0, dot);
  const sigB64 = trimmed.slice(dot + 1);
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = createHmac("sha256", s).update(payloadB64).digest();
  let sig: Buffer;
  try {
    sig = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (expectedSig.length !== sig.length || !timingSafeEqual(expectedSig, sig)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.exportId !== "string" || typeof o.userId !== "string" || typeof o.exp !== "number") return null;
  if (o.exportId !== expectedExportId) return null;
  if (o.exp < Math.floor(Date.now() / 1000)) return null;
  return { v: 1, exportId: o.exportId, userId: o.userId, exp: o.exp };
}
