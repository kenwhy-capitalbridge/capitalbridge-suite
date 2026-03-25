import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const dynamic = "force-dynamic";

type ModelKey =
  | "forever-income-model"
  | "income-engineering-model"
  | "capital-health-model"
  | "capital-stress-model";

type Body = {
  model_key?: string;
  status?: "draft" | "completed" | "failed";
  input?: unknown;
  output?: unknown;
  shared_facts?: Record<string, unknown>;
};

function isModelKey(v: string): v is ModelKey {
  return (
    v === "forever-income-model" ||
    v === "income-engineering-model" ||
    v === "capital-health-model" ||
    v === "capital-stress-model"
  );
}

async function ensureActiveMembershipForUser(userId: string) {
  const supabase = await createAppServerClient();
  const { data, error } = await supabase
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false as const };
  return { ok: !!data };
}

export async function POST(req: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const access = await ensureActiveMembershipForUser(user.id);
    if (!access.ok) return NextResponse.json({ error: "membership_inactive" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const modelKey = String(body.model_key ?? "");
    if (!isModelKey(modelKey)) {
      return NextResponse.json({ error: "invalid_model_key" }, { status: 400 });
    }
    const status = body.status ?? "completed";

    const { data: run, error: runErr } = await supabase
      .schema("public")
      .from("model_runs")
      .insert({
        user_id: user.id,
        model_key: modelKey,
        source_app: "advisoryplatform",
        status,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr || !run?.id) {
      console.error("[api/model/run] create run failed", runErr?.message);
      return NextResponse.json({ error: "create_run_failed" }, { status: 500 });
    }

    if (body.input !== undefined) {
      const { error } = await supabase.schema("public").from("model_inputs").insert({
        run_id: run.id,
        user_id: user.id,
        payload: body.input as object,
      });
      if (error) {
        console.error("[api/model/run] insert input failed", error.message);
        return NextResponse.json({ error: "create_input_failed" }, { status: 500 });
      }
    }

    if (body.output !== undefined) {
      const { error } = await supabase.schema("public").from("model_outputs").insert({
        run_id: run.id,
        user_id: user.id,
        payload: body.output as object,
      });
      if (error) {
        console.error("[api/model/run] insert output failed", error.message);
        return NextResponse.json({ error: "create_output_failed" }, { status: 500 });
      }
    }

    if (body.shared_facts && typeof body.shared_facts === "object") {
      const rows = Object.entries(body.shared_facts).map(([fact_key, fact_value]) => ({
        user_id: user.id,
        fact_key,
        fact_value: fact_value as object,
        source_model_key: modelKey,
        run_id: run.id,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .schema("public")
          .from("model_shared_facts")
          .upsert(rows, { onConflict: "user_id,fact_key" });
        if (error) {
          console.error("[api/model/run] upsert shared facts failed", error.message);
          return NextResponse.json({ error: "upsert_shared_facts_failed" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, run_id: run.id });
  } catch (e) {
    console.error("[api/model/run]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
