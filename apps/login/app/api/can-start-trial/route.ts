import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

const MAX_TRIALS = 2;

/**
 * Returns whether the current user can start a trial (trial_count < 2).
 * Use before redirecting to signup?plan=trial or confirm-payment so you can show a message.
 */
export async function GET() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ canStartTrial: false, reason: "not_logged_in" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .schema("public")
      .from("profiles")
      .select("trial_count")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ canStartTrial: true, trialCount: 0 });
    }

    const count = Number(profile.trial_count) ?? 0;
    const canStartTrial = count < MAX_TRIALS;

    return NextResponse.json({
      canStartTrial,
      trialCount: count,
      reason: canStartTrial ? undefined : "limit_reached",
    });
  } catch {
    return NextResponse.json(
      { canStartTrial: false, reason: "error" },
      { status: 500 }
    );
  }
}
