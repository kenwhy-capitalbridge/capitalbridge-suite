import { NextResponse } from "next/server";
import { handleAdvisorySessionPOST } from "@cb/advisory-graph/server/advisoryRoutes";

export const dynamic = "force-dynamic";

export async function POST() {
  const out = await handleAdvisorySessionPOST("[capital-health/api/advisory-session]");
  return NextResponse.json(out.body, { status: out.status });
}
