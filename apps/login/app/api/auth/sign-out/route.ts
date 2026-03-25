import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const runtime = "nodejs";

/**
 * Clears Supabase auth cookies for the current request (used on tab/window close via keepalive fetch).
 */
export async function POST() {
  try {
    const supabase = await createAppServerClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore — client will still attempt local signOut */
  }
  return NextResponse.json({ ok: true });
}
