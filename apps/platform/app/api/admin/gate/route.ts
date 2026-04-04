import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import {
  isPlatformAdminEmail,
  isPlatformAdminSurfaceConfigured,
} from "@/lib/platformAdmin";
import {
  adminGatePasswordOk,
  appendAdminGateCookie,
  clearAdminGateCookie,
  signAdminGateCookieValue,
} from "@/lib/platformAdminGate.server";
import { CB_PLATFORM_ADMIN_GATE_MAX_AGE_SEC } from "@/lib/platformAdminGateShared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isPlatformAdminSurfaceConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { password?: string; logout?: boolean };
  try {
    body = (await request.json()) as { password?: string; logout?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.logout) {
    const res = NextResponse.json({ ok: true });
    clearAdminGateCookie(res);
    return res;
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!adminGatePasswordOk(user.email, password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const exp = Math.floor(Date.now() / 1000) + CB_PLATFORM_ADMIN_GATE_MAX_AGE_SEC;
  const token = signAdminGateCookieValue({
    uid: user.id,
    email: user.email.trim().toLowerCase(),
    exp,
  });
  if (!token) {
    console.error("[admin gate] sign cookie failed (check PLATFORM_ADMIN_PASSWORDS / GATE_SECRET)");
    return NextResponse.json({ error: "Gate misconfigured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  appendAdminGateCookie(res, token);
  return res;
}
