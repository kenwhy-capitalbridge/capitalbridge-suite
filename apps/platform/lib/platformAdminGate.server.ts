import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { platformAdminEmailList } from "./platformAdmin";
import {
  CB_PLATFORM_ADMIN_GATE_COOKIE,
  CB_PLATFORM_ADMIN_GATE_MAX_AGE_SEC,
  getAdminGateKeyMaterial,
  isAdminPasswordGateEnabled,
  splitEnvCsv,
} from "./platformAdminGateShared";

export type AdminGatePayload = { uid: string; email: string; exp: number };

function hmacKeyBytes(): Buffer | null {
  const material = getAdminGateKeyMaterial();
  if (!material) return null;
  return createHash("sha256").update(material, "utf8").digest();
}

export function signAdminGateCookieValue(payload: AdminGatePayload): string | null {
  const key = hmacKeyBytes();
  if (!key) return null;
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", key).update(body, "utf8").digest();
  const bodyB64 = Buffer.from(body, "utf8").toString("base64url");
  const sigB64 = sig.toString("base64url");
  return `${bodyB64}.${sigB64}`;
}

export function verifyAdminGateCookieValue(token: string | undefined | null): AdminGatePayload | null {
  if (!token || !isAdminPasswordGateEnabled()) return null;
  const key = hmacKeyBytes();
  if (!key) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const bodyB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  let body: string;
  let sig: Buffer;
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
    sig = Buffer.from(sigB64, "base64url");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", key).update(body, "utf8").digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  let parsed: AdminGatePayload;
  try {
    parsed = JSON.parse(body) as AdminGatePayload;
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

export function adminGatePasswordOk(sessionEmail: string, password: string): boolean {
  if (!isAdminPasswordGateEnabled()) return true;
  const listed = platformAdminEmailList();
  const idx = listed.indexOf(sessionEmail.trim().toLowerCase());
  if (idx < 0) return false;
  const passwords = splitEnvCsv(process.env.PLATFORM_ADMIN_PASSWORDS);
  if (passwords.length === 0) return false;
  const expected = passwords.length === 1 ? passwords[0] : passwords[idx];
  if (expected == null || expected === "") return false;
  try {
    const a = Buffer.from(password, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function gateCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CB_PLATFORM_ADMIN_GATE_MAX_AGE_SEC,
  };
}

export function appendAdminGateCookie(res: NextResponse, value: string): void {
  res.cookies.set(CB_PLATFORM_ADMIN_GATE_COOKIE, value, gateCookieOptions());
}

export function clearAdminGateCookie(res: NextResponse): void {
  res.cookies.set(CB_PLATFORM_ADMIN_GATE_COOKIE, "", {
    ...gateCookieOptions(),
    maxAge: 0,
  });
}

/**
 * When password gate is enabled, require a valid signed cookie tied to this user.
 * Returns a NextResponse to return early, or null if OK.
 */
export function requireAdminApiGate(request: Request, user: User): NextResponse | null {
  if (!isAdminPasswordGateEnabled()) return null;
  const raw = request.headers.get("cookie") ?? "";
  const token = parseCookieValue(raw, CB_PLATFORM_ADMIN_GATE_COOKIE);
  const payload = verifyAdminGateCookieValue(token);
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!payload || payload.uid !== user.id || payload.email !== email) {
    return NextResponse.json(
      { error: "Admin gate required", code: "admin_gate" },
      { status: 401 },
    );
  }
  return null;
}

function parseCookieValue(header: string, name: string): string | undefined {
  const parts = header.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return undefined;
}
