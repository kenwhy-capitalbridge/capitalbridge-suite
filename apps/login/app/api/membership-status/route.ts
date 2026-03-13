import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { validateSession } from "@/lib/validateSession";

/**
 * Returns whether the current user has an active membership.
 * Used after login to show "Membership expired" before redirecting to platform.
 * Validates session (token reuse protection): if no user_sessions row or token mismatch, returns 401.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const validation = await validateSession(supabase, request);
    if (!validation.valid) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    // Prefer active_memberships view if available; else check memberships table
    let active = false;
    const { data: viewRows } = await supabase
      .from("active_memberships")
      .select("user_id")
      .eq("user_id", validation.userId)
      .limit(1);
    if (Array.isArray(viewRows) && viewRows.length > 0) {
      active = true;
    } else {
      const now = new Date().toISOString();
      const { data: membershipRows } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", validation.userId)
        .eq("status", "active")
        .or(`end_date.is.null,end_date.gte.${now}`)
        .limit(1);
      active = Array.isArray(membershipRows) && membershipRows.length > 0;
    }

    return NextResponse.json({ active });
  } catch {
    return NextResponse.json({ active: false }, { status: 500 });
  }
}
