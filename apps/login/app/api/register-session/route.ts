import { NextResponse } from "next/server";

/**
 * Legacy no-op: session enforcement uses Supabase Auth + revoke-other-sessions.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
