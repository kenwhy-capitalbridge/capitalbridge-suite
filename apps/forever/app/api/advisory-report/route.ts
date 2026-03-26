import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { listReports, saveReport, type ModelType } from "@cb/advisory-graph";

export const dynamic = "force-dynamic";

const MODEL: ModelType = "forever-income";

/** List or fetch one report using the server Supabase client (RLS-safe for cookie session). */
export async function GET(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const list = url.searchParams.get("list");

    if (id) {
      const { data, error } = await supabase
        .schema("advisory_v2")
        .from("advisory_reports")
        .select("id, created_at, inputs, results")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json({
        id: String(data.id),
        created_at: String(data.created_at ?? ""),
        inputs: (data.inputs as Record<string, unknown>) ?? {},
        results: (data.results as Record<string, unknown>) ?? {},
      });
    }

    if (list === "1") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const items = await listReports(supabase, user.id, MODEL, limit);
      return NextResponse.json({ items });
    }

    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  } catch (e) {
    console.error("[forever/api/advisory-report GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** Insert report + trim to 20 (server client). */
export async function POST(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      sessionId?: string;
      inputs?: Record<string, unknown>;
      results?: Record<string, unknown>;
    };

    let sessionId = body.sessionId;
    if (!sessionId) {
      const { data: s, error: se } = await supabase
        .schema("advisory_v2")
        .from("advisory_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (se || !s?.id) {
        console.error("[forever/api/advisory-report POST] session", se?.message);
        return NextResponse.json({ error: se?.message ?? "session_failed" }, { status: 500 });
      }
      sessionId = String(s.id);
    }

    const out = await saveReport(supabase, {
      sessionId,
      userId: user.id,
      modelType: MODEL,
      inputs: body.inputs ?? {},
      results: body.results ?? {},
    });

    if ("error" in out) {
      console.error("[forever/api/advisory-report POST]", out.error);
      return NextResponse.json({ error: out.error }, { status: 500 });
    }

    return NextResponse.json(out);
  } catch (e) {
    console.error("[forever/api/advisory-report POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
