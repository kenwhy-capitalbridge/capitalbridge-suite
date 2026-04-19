import { NextResponse } from "next/server";
import { isStagingCapitalBridgeHost, normalizeRequestHost, STAGING_GATE_COOKIE_NAME } from "@cb/shared/staging";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = normalizeRequestHost(url.hostname);
  if (!isStagingCapitalBridgeHost(host)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const res = NextResponse.redirect(new URL("/staging-access", req.url));
  res.cookies.set(STAGING_GATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
