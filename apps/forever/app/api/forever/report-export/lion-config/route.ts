import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

type PatchBody = {
  exportId?: string;
  lion_config?: Record<string, unknown>;
};

/**
 * PATCH `report_exports.lion_config` for the current user’s row (RLS + explicit ownership check).
 */
export async function PATCH(request: Request) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : "";
  const lion_config = body.lion_config;
  if (!exportId || !lion_config || typeof lion_config !== "object" || Array.isArray(lion_config)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: row, error: selErr } = await supabase
    .from("report_exports")
    .select("user_id")
    .eq("id", exportId)
    .maybeSingle();

  if (selErr || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error: upErr } = await supabase
    .from("report_exports")
    .update({ lion_config })
    .eq("id", exportId)
    .eq("user_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
