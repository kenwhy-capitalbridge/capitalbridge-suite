import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Payment-first proxy: forwards to API billing/request-bill.
 * Creates Auth user (pending) + session + Billplz bill; webhook completes activation + set-password email.
 */
type Body = { email?: string; name?: string; plan?: string };

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
    const apiUrl = `${getApiBaseUrl()}/billing/request-bill`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email ?? "",
        name: body.name ?? "",
        plan: body.plan ?? "trial",
      }),
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
    console.error("[login /api/bill/request] proxy error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
