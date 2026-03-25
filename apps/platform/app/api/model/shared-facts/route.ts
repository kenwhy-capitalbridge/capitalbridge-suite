import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key")?.trim() ?? "";

    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let q = supabase
      .schema("public")
      .from("model_shared_facts")
      .select("fact_key, fact_value, source_model_key, run_id, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (key) q = q.eq("fact_key", key);

    const { data, error } = await q;
    if (error) {
      console.error("[api/model/shared-facts] select failed", error.message);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      facts: data ?? [],
    });
  } catch (e) {
    console.error("[api/model/shared-facts]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
