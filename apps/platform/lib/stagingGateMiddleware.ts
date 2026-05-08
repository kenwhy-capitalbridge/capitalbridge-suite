import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import {
  isStagingCapitalBridgeHost,
  isStagingGateExemptPath,
  normalizeRequestHost,
  STAGING_GATE_COOKIE_NAME,
  verifyStagingGateCookieValue,
} from "@cb/shared/staging";

/**
 * Staging host: require signed `cb_staging_gate` cookie except on exempt paths
 * (see `isStagingGateExemptPath` in `@cb/shared/staging`).
 *
 * Also: `/access` on platform → redirect to login app (legacy behaviour).
 */
export async function stagingHostGateResponse(req: NextRequest): Promise<NextResponse | null> {
  const host = normalizeRequestHost(req.headers.get("host"));
  if (!isStagingCapitalBridgeHost(host)) {
    return null;
  }

  const pathname = req.nextUrl.pathname;
  if (pathname === "/access" || pathname === "/access/") {
    const base = LOGIN_APP_URL.replace(/\/+$/, "");
    const target = new URL(`${base}/access`);
    target.search = req.nextUrl.search;
    const res = NextResponse.redirect(target.toString());
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  }

  if (isStagingGateExemptPath(pathname)) {
    return null;
  }

  const raw = req.cookies.get(STAGING_GATE_COOKIE_NAME)?.value;
  const ok = await verifyStagingGateCookieValue(raw);
  if (ok) {
    return null;
  }

  const u = new URL("/staging-access", req.url);
  const from = `${pathname}${req.nextUrl.searchParams.toString() ? `?${req.nextUrl.searchParams.toString()}` : ""}`;
  u.searchParams.set("from", from || "/");
  const res = NextResponse.redirect(u.toString());
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}
