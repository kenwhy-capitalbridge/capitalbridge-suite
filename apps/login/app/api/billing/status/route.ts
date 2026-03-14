import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiBaseUrl(): string {
  const url =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3002" : "https://api.thecapitalbridge.com");
  return url.replace(/\/$/, "");
}

export async function GET(req: Request) {
  try {
    const currentUrl = new URL(req.url);
    const billId = currentUrl.searchParams.get("bill_id")?.trim();

    if (!billId) {
      return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
    }

    const apiUrl = `${getApiBaseUrl()}/billing/status?bill_id=${encodeURIComponent(billId)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[login /api/billing/status] proxy error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
