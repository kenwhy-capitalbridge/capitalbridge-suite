import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isStagingCapitalBridgeHost,
  isStagingGateExemptPath,
  normalizeRequestHost,
  STAGING_GATE_COOKIE_NAME,
  verifyStagingGateCookieValue,
} from "@cb/shared/staging";

/**
 * When the request host is `staging.thecapitalbridge.com`, require a signed staging
 * gate cookie (set after password at `/api/staging-gate/login`). Returns a response
 * to short-circuit middleware, or `null` to continue.
 */
export async function stagingHostGateResponse(req: NextRequest): Promise<NextResponse | null> {
  const host = normalizeRequestHost(req.headers.get("host"));
  if (!isStagingCapitalBridgeHost(host)) {
    return null;
  }

  if (!process.env.STAGING_GATE_PASSWORD?.trim()) {
    return new NextResponse(
      "Staging sign-in is not configured yet. Add STAGING_GATE_PASSWORD to this deployment’s environment variables in Vercel, then redeploy.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const pathname = req.nextUrl.pathname;
  if (isStagingGateExemptPath(pathname)) {
    return null;
  }

  const raw = req.cookies.get(STAGING_GATE_COOKIE_NAME)?.value;
  if (await verifyStagingGateCookieValue(raw)) {
    return null;
  }

  if (pathname.startsWith("/api/")) {
    const r = NextResponse.json({ error: "Staging access required", code: "staging_gate" }, { status: 401 });
    r.headers.set("Cache-Control", "private, no-store, max-age=0");
    return r;
  }

  const u = new URL("/staging-access", req.url);
  const from = `${pathname}${req.nextUrl.search}`;
  if (from && from !== "/staging-access") {
    u.searchParams.set("from", from.length <= 2048 ? from : "/");
  }
  const res = NextResponse.redirect(u);
  res.headers.set("Cache-Control", "private, no-store, must-revalidate, max-age=0");
  return res;
}
