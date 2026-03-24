import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

export type CheckMembershipReason = "inactive" | "error" | "unauthenticated";

/**
 * Client-side guard: valid only if user has an active membership row.
 * Distinguishes inactive (no access) vs transient errors (retry / safe mode).
 */
export async function GET() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ valid: false as const, reason: "unauthenticated" satisfies CheckMembershipReason });
    }

    const { data: membership, error: memErr } = await supabase
      .schema("public")
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (memErr) {
      console.error("[check-membership] lookup failed", memErr.message);
      return NextResponse.json({ valid: false as const, reason: "error" satisfies CheckMembershipReason });
    }

    if (!membership) {
      return NextResponse.json({ valid: false as const, reason: "inactive" satisfies CheckMembershipReason });
    }

    return NextResponse.json({ valid: true as const });
  } catch (e) {
    console.error("[check-membership]", e);
    return NextResponse.json({ valid: false as const, reason: "error" satisfies CheckMembershipReason });
  }
}
