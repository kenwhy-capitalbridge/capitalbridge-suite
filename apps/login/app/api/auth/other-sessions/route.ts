import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { isUserActiveSessionStale } from "@cb/shared/sessionFingerprint";
import { allowOtherSessionsCheck, RATE_LIMIT_MESSAGE } from "@/lib/authLoginRateLimit";
import { getClientIp } from "@/lib/recoveryAuditLog";
import { authEventLog } from "@/lib/authEventLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

async function findUserIdByEmail(svc: ReturnType<typeof createServiceClient>, email: string): Promise<string | null> {
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
 * Session conflict: public.user_active_session row exists for this user (authoritative).
 * Stale rows are deleted (self-heal) so login is not blocked.
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
  if (!allowOtherSessionsCheck(email, ip)) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const svc = createServiceClient();
    const userId = await findUserIdByEmail(svc, email);
    if (!userId) {
      return NextResponse.json({ hasOtherSessions: false });
    }

    const { data: row, error } = await svc
      .schema("public")
      .from("user_active_session")
      .select("session_id, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[other-sessions] user_active_session lookup failed", error.message);
      return NextResponse.json({ hasOtherSessions: false, detection: "error" });
    }

    const updatedAt = typeof row?.updated_at === "string" ? row.updated_at : null;
    if (row && isUserActiveSessionStale(updatedAt)) {
      const { error: delErr } = await svc.schema("public").from("user_active_session").delete().eq("user_id", userId);
      if (delErr) {
        console.warn("[other-sessions] stale session delete failed", delErr.message);
      }
      return NextResponse.json({ hasOtherSessions: false, detection: "stale_cleared" });
    }

    if (!row?.session_id) {
      return NextResponse.json({ hasOtherSessions: false, detection: "user_active_session" });
    }

    const hasOtherSessions = String(row.session_id).length > 0;
    if (hasOtherSessions) {
      authEventLog("session_conflict", { user_id_prefix: userId.slice(0, 8) });
    }
    return NextResponse.json({ hasOtherSessions, detection: "user_active_session" });
  } catch (e) {
    console.error("[other-sessions]", e);
    return NextResponse.json({ hasOtherSessions: false, detection: "error" });
  }
}
