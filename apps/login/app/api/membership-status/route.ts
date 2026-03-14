import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { validateSession } from "@cb/auth/session";
import { hasActiveMembership } from "@cb/membership/status";

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

    const active = await hasActiveMembership(supabase, validation.userId);
    return NextResponse.json({ active });
  } catch {
    return NextResponse.json({ active: false }, { status: 500 });
  }
}
