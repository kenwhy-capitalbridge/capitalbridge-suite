import { NextResponse } from "next/server";
import {
  isStagingCapitalBridgeHost,
  mintStagingGateCookieValue,
  normalizeRequestHost,
  STAGING_GATE_COOKIE_NAME,
} from "@cb/shared/staging";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const host = normalizeRequestHost(url.host);
  if (!isStagingCapitalBridgeHost(host)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const password = process.env.STAGING_GATE_PASSWORD?.trim();
  if (!password) {
    return NextResponse.json(
      { error: "Staging is not fully configured yet. Please try again later." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong with that request. Please try again." }, { status: 400 });
  }
  const submitted =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password?: unknown }).password ?? "")
      : "";

  if (submitted !== password) {
    return NextResponse.json(
      { error: "That password is not recognised. Check with your team lead and try again." },
      { status: 401 },
    );
  }

  const token = await mintStagingGateCookieValue(MAX_AGE_SEC);
  if (!token) {
    return NextResponse.json(
      { error: "We could not start a staging session. Please refresh and try again." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAGING_GATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return res;
}
