import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

/**
 * Registers the current user's session in public.user_sessions (one session per account).
 * Call this after sign-in so we can enforce single-session and optionally validate IP/UA later.
 * Pass IP and User-Agent from headers so we can match on subsequent requests.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? null;
    if (!token) {
      return NextResponse.json({ error: "No session" }, { status: 400 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const { error } = await supabase.rpc("replace_user_session", {
      p_session_token: token,
      p_ip_address: ip,
      p_user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
