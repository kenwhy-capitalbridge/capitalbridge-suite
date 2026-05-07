import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import {
  isStagingCapitalBridgeHost,
  normalizeRequestHost,
} from "@cb/shared/staging";

/**
 * When the request host is `staging.thecapitalbridge.com`, require a signed staging
 * gate cookie (set after password at `/api/staging-gate/login`). Returns a response
 * to short-circuit middleware, or `null` to continue.
 *
 * `/access` is not implemented on platform — on staging only, send users to the login app
 * with the same query string (e.g. `redirectTo=…`).
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

  return null;
}
