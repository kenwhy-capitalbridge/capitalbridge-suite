import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Payment-first: proxy to API create-session (no auth). Accepts email + plan, returns payment_url.
 */
type Body = { email?: string; plan?: string; name?: string };

function getApiBaseUrl(): string {
  const url =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3002" : "https://api.thecapitalbridge.com");
  return url.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const apiUrl = `${getApiBaseUrl()}/billing/create-session`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email ?? "",
        plan: body.plan ?? "trial",
        name: body.name ?? "",
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: (data?.error as string) ?? "server_error", detail: data?.detail },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[login /api/billing/create-session] proxy error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
