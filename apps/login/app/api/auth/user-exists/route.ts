import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { allowUserExistsCheck, RATE_LIMIT_MESSAGE } from "@/lib/authLoginRateLimit";
import { getClientIp } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Primary: `public.profiles` is keyed by auth user id and stores the canonical login email.
 * This is O(1) and avoids scanning thousands of Auth users via `listUsers` (which only pages
 * the first N users and incorrectly reported `auth_user_exists: false` for many accounts).
 */
async function findProfileIdByEmail(
  svc: ReturnType<typeof createServiceClient>,
  email: string
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const { data, error } = await svc
    .schema("public")
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .limit(1);

  if (error) {
    console.error("[user-exists] profiles lookup", error.message);
    return null;
  }
  const row = data?.[0];
  return typeof row?.id === "string" ? row.id : null;
}

/** Fallback when no profile row yet (rare): paginated Auth scan. */
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

async function billingSessionRegistered(
  svc: ReturnType<typeof createServiceClient>,
  email: string,
  profileId: string | null
): Promise<boolean> {
  const normalized = normalizeEmail(email);

  const { data: billingByNorm } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();
  if (billingByNorm?.id) return true;

  const { data: billingByRaw } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id")
    .eq("email", email.trim())
    .limit(1)
    .maybeSingle();
  if (billingByRaw?.id) return true;

  if (profileId) {
    const { data: byUser } = await svc
      .schema("public")
      .from("billing_sessions")
      .select("id")
      .eq("user_id", profileId)
      .limit(1)
      .maybeSingle();
    if (byUser?.id) return true;
  }

  return false;
}

/**
 * Pre-login: whether a Capital Bridge account exists (profile / auth) and whether billing
 * has been recorded for this email or for this profile id.
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

    const profileId = await findProfileIdByEmail(svc, email);
    let authUserId = profileId;
    if (!authUserId) {
      authUserId = await findAuthUserIdByEmail(svc, email);
    }
    const auth_user_exists = !!authUserId;

    const billing_email_registered = await billingSessionRegistered(svc, email, authUserId);

    return NextResponse.json({
      auth_user_exists,
      billing_email_registered,
    });
  } catch (e) {
    console.error("[user-exists]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
