import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Creates advisory_v2.advisory_sessions using the server Supabase client (cookie session).
 * Browser inserts often fail under RLS; this keeps Save working for logged-in users.
 */
export async function POST() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .schema("advisory_v2")
      .from("advisory_sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (error) {
      console.error("[forever/api/advisory-session]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.id) {
      return NextResponse.json({ error: "no_session_id" }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("[forever/api/advisory-session]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
