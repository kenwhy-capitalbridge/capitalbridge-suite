import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_PREFIX = "v1";

export const RECOVERY_TOKEN_TTL_SEC = 15 * 60; // 15 minutes

function getSecret(): string {
  const s = process.env.PAYMENT_RECOVERY_JWT_SECRET?.trim();
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") {
    const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (fallback && fallback.length >= 32) {
      console.warn(
        "[payment-recovery] PAYMENT_RECOVERY_JWT_SECRET unset — using service key fallback (dev only)"
      );
      return `dev-fallback:${fallback.slice(0, 32)}`;
    }
  }
  throw new Error("PAYMENT_RECOVERY_JWT_SECRET must be set (min 32 chars) for payment recovery tokens");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (b64.length % 4);
  if (pad < 4) b64 += "=".repeat(pad);
  return Buffer.from(b64, "base64");
}

export type RecoveryTokenPayload = {
  bid: string;
  sid: string;
  exp: number;
  iat: number;
  jti: string;
};

export function signRecoveryToken(billId: string, billingSessionId: string): { token: string; exp: number } {
  const secret = getSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + RECOVERY_TOKEN_TTL_SEC;
  const payload: RecoveryTokenPayload = {
    bid: billId.trim(),
    sid: billingSessionId.trim(),
    exp,
    iat,
    jti: randomBytes(16).toString("hex"),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64url(Buffer.from(payloadJson, "utf8"));
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  const sigB64 = b64url(sig);
  return { token: `${TOKEN_PREFIX}.${payloadB64}.${sigB64}`, exp };
}

export function verifyRecoveryToken(token: string): RecoveryTokenPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
    const [, payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return null;
    const sig = b64urlDecode(sigB64);
    const expected = createHmac("sha256", secret).update(payloadB64).digest();
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as RecoveryTokenPayload;
    if (!payload?.bid || !payload?.sid || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
