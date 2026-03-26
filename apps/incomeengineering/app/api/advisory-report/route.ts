import { NextResponse } from "next/server";
import type { ModelType } from "@cb/advisory-graph";
import {
  handleAdvisoryReportGET,
  handleAdvisoryReportPOST,
} from "@cb/advisory-graph/server/advisoryRoutes";

export const dynamic = "force-dynamic";

const MODEL: ModelType = "income-engineering";

export async function GET(request: Request) {
  const out = await handleAdvisoryReportGET(
    request,
    MODEL,
    "[income-engineering/api/advisory-report GET]",
    "ADVISORY_INCOME_ENGINEERING_MODEL_TYPE"
  );
  return NextResponse.json(out.body, { status: out.status });
}

export async function POST(request: Request) {
  const out = await handleAdvisoryReportPOST(
    request,
    MODEL,
    "[income-engineering/api/advisory-report POST]",
    "ADVISORY_INCOME_ENGINEERING_MODEL_TYPE"
  );
  return NextResponse.json(out.body, { status: out.status });
}
