import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { allowUserExistsCheck, RATE_LIMIT_MESSAGE } from "@/lib/authLoginRateLimit";
import { getClientIp } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

async function findAuthUserIdByEmail(
  svc: ReturnType<typeof createServiceClient>,
  email: string
): Promise<string | null> {
  const target = normalizeEmail(email);
  let page = 1;
  const maxPages = 50;
  while (page <= maxPages) {
    const { data: listData } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    const u = listData?.users?.find((x) => normalizeEmail(x.email ?? "") === target);
    if (u?.id) return u.id;
    if (!listData?.users?.length || listData.users.length < 1000) break;
    page += 1;
  }
  return null;
}

/**
 * Pre-login: auth user exists + billing_sessions row with this email (normalized).
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (!allowUserExistsCheck(email, ip)) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const svc = createServiceClient();
    const normalized = normalizeEmail(email);

    const authUserId = await findAuthUserIdByEmail(svc, email);
    const auth_user_exists = !!authUserId;

    let billing_email_registered = false;
    const { data: billingByNorm } = await svc
      .schema("public")
      .from("billing_sessions")
      .select("id")
      .eq("email", normalized)
      .limit(1)
      .maybeSingle();
    if (billingByNorm?.id) {
      billing_email_registered = true;
    } else {
      const { data: billingByRaw } = await svc
        .schema("public")
        .from("billing_sessions")
        .select("id")
        .eq("email", email.trim())
        .limit(1)
        .maybeSingle();
      billing_email_registered = !!billingByRaw?.id;
    }

    return NextResponse.json({
      auth_user_exists,
      billing_email_registered,
    });
  } catch (e) {
    console.error("[user-exists]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
