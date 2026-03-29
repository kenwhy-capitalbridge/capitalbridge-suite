import { NextResponse } from "next/server";
import { handleAdvisoryPersonaGET } from "@cb/advisory-graph/server/advisoryRoutes";

export const dynamic = "force-dynamic";

export async function GET() {
  const out = await handleAdvisoryPersonaGET("[capitalstress/api/advisory-persona]");
  return NextResponse.json(out.body, { status: out.status });
}
