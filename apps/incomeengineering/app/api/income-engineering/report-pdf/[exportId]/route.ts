import { NextResponse, type NextRequest } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { buildCapitalBridgePdfFilename } from "@cb/shared/reportTraceability";
import { reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { signPdfCaptureToken } from "@cb/shared/pdfCaptureToken";
import { getPdfCaptureSecret } from "@/lib/pdfCaptureEnv";
import { renderPdf } from "@cb/pdf/render";

import { cookiesForPlaywright } from "@/lib/cookiesForPlaywright";

function reportPdfApiTimingLog(
  route: "income-engineering",
  stage: string,
  t0: number,
  extra?: Record<string, string | number | boolean>,
): void {
  if (process.env.PDF_RENDER_TIMING_LOG !== "1") return;
  console.log(
    JSON.stringify({
      tag: "report-pdf-api",
      route,
      stage,
      elapsed_ms: Date.now() - t0,
      ...extra,
    }),
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Vercel Pro: up to 300s. Hobby caps lower — use PDF_RENDER_BUDGET_MS if you hit FUNCTION_INVOCATION_TIMEOUT. */
export const maxDuration = 300;

export async function GET(request: NextRequest, ctx: { params: Promise<{ exportId: string }> }) {
  const apiT0 = Date.now();
  const { exportId } = await ctx.params;
  const id = typeof exportId === "string" ? exportId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  reportPdfApiTimingLog("income-engineering", "request_start", apiT0, { export_id_prefix: id.slice(0, 8) });

  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error: rowErr } = await supabase
    .from("report_exports")
    .select("id, user_id, created_at, report_id")
    .eq("id", id)
    .maybeSingle();

  if (rowErr || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  reportPdfApiTimingLog("income-engineering", "session_and_report_exports_ok", apiT0);

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("first_name, last_name, advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const reportClientDisplayName = reportClientDisplayNameFromAuth({
    email: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
    profile: profile ?? null,
  });

  const createdAt = new Date(row.created_at);
  const filename = buildCapitalBridgePdfFilename({
    modelCode: "INCOME",
    userDisplayName: reportClientDisplayName,
    versionLabel: "v1.0",
    generatedAt: createdAt,
  });

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3005";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const cookieHeader = request.headers.get("cookie");
  const pdfSecret = getPdfCaptureSecret();
  let docUrl: string;
  let playwrightCookies: ReturnType<typeof cookiesForPlaywright>;
  if (pdfSecret) {
    const pdfToken = signPdfCaptureToken({ exportId: id, userId: user.id }, pdfSecret);
    docUrl = `${origin}/dashboard/income-report-document/${id}?pdfCapture=${encodeURIComponent(pdfToken)}`;
    playwrightCookies = [];
  } else {
    docUrl = `${origin}/dashboard/income-report-document/${id}`;
    playwrightCookies = cookiesForPlaywright(cookieHeader, origin);
    if (playwrightCookies.length === 0) {
      return NextResponse.json(
        {
          error:
            "PDF capture is not configured: set SUPABASE_SERVICE_ROLE_KEY or REPORT_PDF_CAPTURE_SECRET for this Vercel project.",
        },
        { status: 500 },
      );
    }
  }

  const budgetMs =
    Number(process.env.PDF_RENDER_BUDGET_MS) > 0 ? Number(process.env.PDF_RENDER_BUDGET_MS) : 280_000;

  reportPdfApiTimingLog("income-engineering", "before_renderPdf", apiT0, {
    budget_ms: budgetMs,
    use_pdf_capture: Boolean(pdfSecret),
  });

  let pdf: Buffer;
  try {
    pdf = await renderPdf({
      url: docUrl,
      playwrightFooterFromDom: true,
      playwrightCookies: playwrightCookies.length > 0 ? playwrightCookies : undefined,
      navigateWaitUntil: "domcontentloaded",
      budgetMs,
      timeoutMs: budgetMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render_failed";
    console.error("[income-engineering] renderPdf failed:", e);
    reportPdfApiTimingLog("income-engineering", "renderPdf_error", apiT0, { message: msg.slice(0, 200) });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  reportPdfApiTimingLog("income-engineering", "after_renderPdf", apiT0, { pdf_bytes: pdf.length });

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
