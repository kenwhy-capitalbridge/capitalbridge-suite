import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { withSuiteAuthCookieOptions } from "@cb/supabase/authCookieOptions";
import {
  getJwtSessionIdFromAccessToken,
  isUserActiveSessionStale,
} from "@cb/shared/sessionFingerprint";
import {
  decodeMembershipSafeCookie,
  encodeMembershipSafeCookie,
  MEMBERSHIP_SAFE_MODE_SEC,
} from "./lib/safeModeCookie";
import { isPlatformAdminEmail, isPlatformAdminSurfaceConfigured } from "./lib/platformAdmin";
import {
  getAdminGateCookieFromHeader,
  verifyAdminGateCookieValueEdge,
} from "./lib/platformAdminGate.edge";
import { isAdminPasswordGateEnabled } from "./lib/platformAdminGateShared";

const CB_MBR_SAFE = "cb_mbr_safe";

/** Avoid stale HTML at CDNs; helps confirm deploys via curl -I (X-CB-Commit). */
function applyHtmlNoStoreHeaders(res: NextResponse): void {
  res.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0"
  );
  res.headers.set("Vary", "Cookie");
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) res.headers.set("X-CB-Commit", sha);
}

function isProtected(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/profile" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  );
}

/** Only the password form is gate-exempt; nested routes like /admin/login/strategic require the gate cookie. */
function isAdminGatePasswordPage(pathname: string): boolean {
  return pathname === "/admin/login" || pathname === "/admin/login/";
}

async function clearUserActiveSessionRow(userId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  try {
    const res = await fetch(
      `${base}/rest/v1/user_active_session?user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        },
      }
    );
    if (!res.ok) {
      console.warn("[platform middleware] user_active_session DELETE", res.status);
    }
  } catch (e) {
    console.error("[platform middleware] user_active_session clear failed", e);
  }
}

async function redirectWithSignOut(
  req: NextRequest,
  target: URL,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userIdForSlotClear?: string
): Promise<NextResponse> {
  if (userIdForSlotClear) {
    await clearUserActiveSessionRow(userIdForSlotClear);
  }
  let response = NextResponse.redirect(target.toString());
  response.cookies.set(CB_MBR_SAFE, "", { maxAge: 0, path: "/" });
  const supabaseSignOut = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, withSuiteAuthCookieOptions(options));
        });
      },
    },
  });
  await supabaseSignOut.auth.signOut();
  return response;
}

/**
 * Send to login **without** `signOut()`. Clearing cookies here was wiping valid
 * suite-wide sessions when the first platform request briefly saw no user (e.g.
 * after navigating from a model app) — same redirect URL as “logged out” but the
 * root cause was aggressive cookie clearing, not the Back link.
 */
function redirectToLoginPage(
  req: NextRequest,
  extraParams?: Record<string, string>
): NextResponse {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("redirectTo", `${req.nextUrl.origin}${req.nextUrl.pathname}`);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) u.searchParams.set(k, v);
    }
  }
  const res = NextResponse.redirect(u.toString());
  applyHtmlNoStoreHeaders(res);
  return res;
}

function redirectToSignIn(
  req: NextRequest,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userIdForSlotClear?: string
) {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("redirectTo", `${req.nextUrl.origin}${req.nextUrl.pathname}`);
  return redirectWithSignOut(req, u, supabaseUrl, supabaseAnonKey, userIdForSlotClear);
}

function redirectMembershipInactive(
  req: NextRequest,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userIdForSlotClear?: string
) {
  const u = new URL(`${LOGIN_APP_URL}/access`);
  u.searchParams.set("membership_inactive", "1");
  return redirectWithSignOut(req, u, supabaseUrl, supabaseAnonKey, userIdForSlotClear);
}

function clearSafeModeCookie(response: NextResponse): void {
  response.cookies.set(CB_MBR_SAFE, "", { maxAge: 0, path: "/" });
}

function applySafeModeCookie(response: NextResponse, userId: string): void {
  const expSec = Math.floor(Date.now() / 1000) + MEMBERSHIP_SAFE_MODE_SEC;
  const val = encodeMembershipSafeCookie(userId, expSec);
  response.cookies.set(CB_MBR_SAFE, val, {
    maxAge: MEMBERSHIP_SAFE_MODE_SEC,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Platform: Supabase session + active membership. Transient membership DB errors → short safe mode (no access if truly inactive).
 */
export async function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const pathname = req.nextUrl.pathname;
  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !isPlatformAdminSurfaceConfigured()
  ) {
    if (pathname.startsWith("/api/admin")) {
      const r = NextResponse.json({ error: "Not found" }, { status: 404 });
      applyHtmlNoStoreHeaders(r);
      return r;
    }
    const r = new NextResponse(null, { status: 404 });
    applyHtmlNoStoreHeaders(r);
    return r;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });
  applyHtmlNoStoreHeaders(response);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, withSuiteAuthCookieOptions(options));
        });
      },
    },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("[platform middleware] getUser failed", userErr.message);
    return redirectToLoginPage(req);
  }

  if (!user) {
    return redirectToLoginPage(req);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? null;
  if (!accessToken) {
    return redirectToLoginPage(req);
  }

  const userId = user.id;
  const nowSec = Math.floor(Date.now() / 1000);
  const safeDecoded = decodeMembershipSafeCookie(req.cookies.get(CB_MBR_SAFE)?.value);
  const safeForUser =
    safeDecoded && safeDecoded.userId === userId && safeDecoded.expSec > nowSec;

  const queryMembership = async () =>
    supabase
      .schema("public")
      .from("memberships")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

  let { data: membership, error: memErr } = await queryMembership();
  if (memErr) {
    const second = await queryMembership();
    membership = second.data;
    memErr = second.error;
  }

  if (!memErr && membership) {
    clearSafeModeCookie(response);
  }

  if (!memErr && !membership) {
    clearSafeModeCookie(response);
    return redirectMembershipInactive(req, supabaseUrl, supabaseAnonKey, userId);
  }

  if (memErr) {
    console.error("[platform middleware] memberships lookup failed", memErr.message);
    if (safeForUser) {
      return response;
    }
    applySafeModeCookie(response, userId);
    return response;
  }

  const jwtSessionId = getJwtSessionIdFromAccessToken(accessToken);

  const querySlot = async () =>
    supabase
      .schema("public")
      .from("user_active_session")
      .select("session_id, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

  let { data: slot, error: slotErr } = await querySlot();
  if (slotErr) {
    const s2 = await querySlot();
    slot = s2.data;
    slotErr = s2.error;
  }

  if (slotErr) {
    console.error("[platform middleware] user_active_session lookup failed", slotErr.message);
    return response;
  }

  if (slot?.session_id && !isUserActiveSessionStale(typeof slot.updated_at === "string" ? slot.updated_at : null)) {
    if (jwtSessionId != null && String(slot.session_id) !== jwtSessionId) {
      return redirectToSignIn(req, supabaseUrl, supabaseAnonKey, userId);
    }
  }

  if (
    isAdminPasswordGateEnabled() &&
    user.email &&
    isPlatformAdminEmail(user.email)
  ) {
    const gateExempt =
      isAdminGatePasswordPage(pathname) || pathname.startsWith("/api/admin/gate");
    const gateRequired =
      (pathname.startsWith("/admin") && !isAdminGatePasswordPage(pathname)) ||
      (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/gate"));

    if (gateRequired && !gateExempt) {
      const raw = getAdminGateCookieFromHeader(req.headers.get("cookie"));
      const payload = await verifyAdminGateCookieValueEdge(raw);
      const email = user.email.trim().toLowerCase();
      if (!payload || payload.uid !== user.id || payload.email !== email) {
        if (pathname.startsWith("/api/admin")) {
          const r = NextResponse.json(
            { error: "Admin gate required", code: "admin_gate" },
            { status: 401 },
          );
          applyHtmlNoStoreHeaders(r);
          return r;
        }
        const u = new URL("/admin/login", req.url);
        u.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
        const r = NextResponse.redirect(u);
        applyHtmlNoStoreHeaders(r);
        return r;
      }
    }
  }

  return response;
}
