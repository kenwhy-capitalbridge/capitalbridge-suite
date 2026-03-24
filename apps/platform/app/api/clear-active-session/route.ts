import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Clears public.user_active_session for the current cookie session (logout cleanup).
 */
export async function POST() {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient();
    const { error } = await svc.schema("public").from("user_active_session").delete().eq("user_id", user.id);
    if (error) {
      console.error("[clear-active-session]", error.message);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clear-active-session]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
