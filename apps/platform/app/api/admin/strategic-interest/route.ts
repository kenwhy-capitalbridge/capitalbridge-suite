import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import {
  isPlatformAdminEmail,
  isPlatformAdminSurfaceConfigured,
  isStrategicInterestStatus,
} from "@/lib/platformAdmin";
import { requireAdminApiGate } from "@/lib/platformAdminGate.server";
import { loadStrategicInterestAdminRows } from "@/lib/strategicInterestAdminLoad";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isPlatformAdminSurfaceConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const gate = requireAdminApiGate(request, user);
  if (gate) return gate;

  const svc = createServiceClient();
  const { rows, error } = await loadStrategicInterestAdminRows(svc);
  if (error) {
    console.error("[admin strategic-interest GET]", error);
    return NextResponse.json({ error: "Unable to load records" }, { status: 500 });
  }

  return NextResponse.json({ rows });
}

export async function PATCH(request: Request) {
  if (!isPlatformAdminSurfaceConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const gate = requireAdminApiGate(request, user);
  if (gate) return gate;

  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as { id?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!id || !isStrategicInterestStatus(status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
  }

  const svc = createServiceClient();
  const patch: Record<string, unknown> = { status };
  if (status === "contacted") {
    patch.last_contacted_at = new Date().toISOString();
  }

  const { data: updated, error } = await svc
    .schema("public")
    .from("strategic_interest")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin strategic-interest PATCH]", error.message);
    return NextResponse.json({ error: "Unable to update" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ row: updated });
}
