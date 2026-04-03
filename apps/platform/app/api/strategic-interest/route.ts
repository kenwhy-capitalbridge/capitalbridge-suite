import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";

type StrategicInterestBody = {
  reportId?: string | null;
  country?: string;
  interestType?: string | null;
  consentReview?: boolean;
  consentContact?: boolean;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as StrategicInterestBody;
    const country = String(body.country ?? "").trim().toUpperCase();
    const interestType = body.interestType ? String(body.interestType).trim() : null;

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }
    if (!body.consentReview || !body.consentContact) {
      return NextResponse.json({ error: "Both consent checkboxes are required" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { error } = await svc.schema("public").from("strategic_interest").insert({
      user_id: user.id,
      report_id: body.reportId ? String(body.reportId).trim() : null,
      country,
      interest_type: interestType,
    });

    if (error) {
      console.error("[strategic-interest POST] insert failed", error.message);
      return NextResponse.json({ error: "Unable to save priority access request" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[strategic-interest POST] unexpected error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
