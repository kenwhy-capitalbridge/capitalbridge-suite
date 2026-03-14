import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";

export const runtime = "nodejs";

/**
 * Proxy: no billing logic here. Forwards to API with user's Bearer token.
 * Login server reads session from cookies, calls api.thecapitalbridge.com/billing/create.
 */
type Body = { plan?: string };

function getApiBaseUrl(): string {
  const url =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3002" : "https://api.thecapitalbridge.com");
  return url.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const apiUrl = `${getApiBaseUrl()}/billing/create`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: body.plan ?? "trial" }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: (data?.error as string) ?? "server_error", detail: data?.detail, message: data?.message },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[login /api/bill/create] proxy error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
