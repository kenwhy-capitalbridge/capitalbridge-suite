import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { requireAdminApiGate } from "@/lib/platformAdminGate.server";
import {
  loadStrategicBriefingForUserIds,
  parseUserIdsFromRequestBody,
} from "@/lib/strategicBriefingLoad";

export const dynamic = "force-dynamic";

/**
 * POST { userIds: string[] } — platform admin only.
 * Returns strategic_interest rows + latest advisory_v2 reports per model per user.
 */
export async function POST(request: Request) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const gate = requireAdminApiGate(request, user);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userIds = parseUserIdsFromRequestBody(body);
  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "Provide userIds: string[] with at least one valid UUID" },
      { status: 400 },
    );
  }

  try {
    const svc = createServiceClient();
    const { briefings, error } = await loadStrategicBriefingForUserIds(svc, userIds);
    if (error) {
      console.error("[admin strategic-briefing]", error);
      return NextResponse.json({ error: "Unable to load briefing data" }, { status: 500 });
    }
    return NextResponse.json({ briefings });
  } catch (e) {
    console.error("[admin strategic-briefing] unexpected", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
