import { NextResponse } from "next/server";

/**
 * Stub for pricing flow: plan is passed via redirect to /confirm-payment?plan=...
 * Real billing is created by the API app when confirm-payment calls it.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
