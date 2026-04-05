import { NextResponse, type NextRequest } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { buildForeverIncomeModelReportFilename } from "@cb/shared/reportTraceability";
import { marketIdToReportExportTimeZone, normalizeMarketId } from "@cb/shared/markets";
import { renderPdf } from "@cb/pdf/render";

import { cookiesForPlaywright } from "@/lib/cookiesForPlaywright";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function profilePricingTimeZone(profile: { advisory_market: string | null } | null): string {
  try {
    return marketIdToReportExportTimeZone(normalizeMarketId(profile?.advisory_market));
  } catch {
    return "UTC";
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ exportId: string }> }) {
  const { exportId } = await ctx.params;
  const id = typeof exportId === "string" ? exportId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error: rowErr } = await supabase
    .from("report_exports")
    .select("id, user_id, tier, created_at, report_id")
    .eq("id", id)
    .maybeSingle();

  if (rowErr || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const timeZone = profilePricingTimeZone(profile);
  const createdAt = new Date(row.created_at);
  const filename = buildForeverIncomeModelReportFilename({
    planSlug: String(row.tier ?? ""),
    createdAt,
    timeZone,
  });

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3006";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const docUrl = `${origin}/dashboard/report-document/${id}`;
  const cookieHeader = request.headers.get("cookie");
  const playwrightCookies = cookiesForPlaywright(cookieHeader, origin);

  let pdf: Buffer;
  try {
    pdf = await renderPdf({
      url: docUrl,
      playwrightFooterFromDom: true,
      playwrightCookies: playwrightCookies.length > 0 ? playwrightCookies : undefined,
      timeoutMs: 120_000,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const safeName = filename.replace(/"/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
