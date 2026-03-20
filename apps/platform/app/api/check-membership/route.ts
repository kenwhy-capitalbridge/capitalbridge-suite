import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Client-side guard: valid only if user has a profile and an active_memberships row.
 */
export async function GET() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // No session — nothing to validate (avoid forcing redirect on public platform routes).
      return NextResponse.json({ valid: true });
    }

    const { data: profile, error: profileErr } = await supabase
      .schema("public")
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ valid: false });
    }

    const { data: activeMembership, error: amErr } = await supabase
      .schema("public")
      .from("active_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (amErr || !activeMembership) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
