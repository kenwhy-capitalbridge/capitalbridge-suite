import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { validateSession } from "@cb/auth/session";

/**
 * GET /api/membership/status
 * Returns membership status, plan, and expires_at for the current user.
 * Used by middleware and frontends to enforce access control.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const validation = await validateSession(supabase, request);
    if (!validation.valid) {
      return NextResponse.json(
        { status: null, plan: null, expires_at: null, active: false },
        { status: 401 }
      );
    }

    const { data: membership } = await supabase
      .schema("public")
      .from("memberships")
      .select("id, status, start_date, end_date, started_at, expires_at, plan_id")
      .eq("user_id", validation.userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({
        status: null,
        plan: null,
        expires_at: null,
        active: false,
      });
    }

    const now = new Date().toISOString();
    const expiresAt = membership.expires_at ?? membership.end_date;
    const active =
      (membership.start_date != null || membership.started_at != null) &&
      (expiresAt == null || expiresAt > now);

    let planSlug: string | null = null;
    if (membership.plan_id) {
      const { data: plan } = await supabase
        .schema("public")
        .from("plans")
        .select("slug, name")
        .eq("id", membership.plan_id)
        .maybeSingle();
      planSlug = plan?.slug ?? null;
    }

    return NextResponse.json({
      status: membership.status,
      plan: planSlug,
      expires_at: expiresAt,
      active,
    });
  } catch {
    return NextResponse.json(
      { status: null, plan: null, expires_at: null, active: false },
      { status: 500 }
    );
  }
}
