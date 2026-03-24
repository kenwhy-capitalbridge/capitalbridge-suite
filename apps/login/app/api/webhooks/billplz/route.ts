import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

function getApiBaseUrl(): string {
  const url =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3002" : "https://api.thecapitalbridge.com");
  return url.replace(/\/$/, "");
}

/**
 * Billplz webhook: when a billing_sessions row exists for this bill, forward to API.
 * Membership activation uses billing_sessions only (API handler).
 */
export async function POST(req: Request) {
  const svc = createServiceClient();

  const body = (await req
    .formData()
    .then((fd) => Object.fromEntries(fd.entries()))
    .catch(async () => {
      return (await req.json().catch(() => ({}))) as Record<string, unknown>;
    })) as Record<string, unknown>;

  const billId = (body["id"] ?? body["billplz[id]"] ?? body["billplz_id"]) as string | undefined;

  if (!billId) {
    return NextResponse.json({ ok: false, error: "missing_bill_id" }, { status: 400 });
  }

  const { data: sessionByBill } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionByBill) {
    try {
      const apiUrl = `${getApiBaseUrl()}/billing/billplz-webhook`;
      const form = new FormData();
      for (const [k, v] of Object.entries(body)) {
        form.append(k, typeof v === "string" ? v : String(v ?? ""));
      }
      const res = await fetch(apiUrl, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (err) {
      console.error("[login webhooks/billplz] forward to API failed", err);
      return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
    }
  }

  console.warn("[login webhooks/billplz] no billing_sessions row for bill", { billId });
  return NextResponse.json({ ok: false, error: "billing_session_not_found" }, { status: 404 });
}
