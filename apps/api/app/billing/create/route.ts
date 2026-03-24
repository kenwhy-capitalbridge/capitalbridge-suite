import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";

export const runtime = "nodejs";

/** Reuse existing session/bill if within this window (ms). Prevents duplicate bills on retry/refresh. */
const SESSION_REUSE_MS = 24 * 60 * 60 * 1000; // 24 hours

type Body = { plan?: string };

/**
 * Authenticated billing: one billing_sessions row = one Billplz bill; payment webhook creates membership.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "unauthorized", detail: "missing_bearer_token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const requestedPlan = (body.plan ?? "trial").toString();

    const svc = createServiceClient();
    const {
      data: { user },
      error: userError,
    } = await svc.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json({ error: "unauthorized", detail: userError?.message ?? "invalid_token" }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "email_required", detail: "billing_sessions requires email" }, { status: 400 });
    }

    const { data: planRow, error: planErr } = await svc
      .schema("public")
      .from("plans")
      .select("id, slug, name, price_cents, duration_days, is_trial")
      .eq("slug", requestedPlan)
      .maybeSingle();

    if (planErr || !planRow) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    if (planRow.is_trial) {
      const { data: profile } = await svc
        .schema("public")
        .from("profiles")
        .select("trial_use_count")
        .eq("id", user.id)
        .maybeSingle();
      const used = profile?.trial_use_count ?? 0;
      if (used >= 2) {
        return NextResponse.json({ error: "trial_limit_reached" }, { status: 403 });
      }
    }

    const now = new Date();
    const reuseCutoff = new Date(now.getTime() - SESSION_REUSE_MS);

    const { data: existingSession } = await svc
      .schema("public")
      .from("billing_sessions")
      .select("id, status, bill_id, payment_url, created_at, payment_attempt_count")
      .eq("user_id", user.id)
      .eq("plan_id", planRow.id)
      .in("status", ["pending", "bill_created"])
      .gte("created_at", reuseCutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession?.id) {
      const attemptCount = (existingSession as { payment_attempt_count?: number }).payment_attempt_count ?? 0;
      await svc
        .schema("public")
        .from("billing_sessions")
        .update({
          payment_attempt_count: attemptCount + 1,
          updated_at: now.toISOString(),
          last_payment_error: null,
        })
        .eq("id", existingSession.id);
    }

    if (existingSession?.bill_id && existingSession?.payment_url && existingSession.status === "bill_created") {
      return NextResponse.json({ bill_id: existingSession.bill_id, checkoutUrl: existingSession.payment_url });
    }

    let sessionId = existingSession?.id ?? null;
    if (!sessionId) {
      const { data: newSession, error: sessionErr } = await svc
        .schema("public")
        .from("billing_sessions")
        .insert({
          user_id: user.id,
          email: user.email ?? "",
          plan_id: planRow.id,
          plan: planRow.slug,
          status: "pending",
          payment_attempt_count: 1,
          updated_at: now.toISOString(),
        })
        .select("id")
        .single();

      if (sessionErr || !newSession?.id) {
        console.error("[api/billing/create] billing_sessions insert failed:", sessionErr);
        return NextResponse.json(
          { error: "session_create_failed", detail: sessionErr?.message ?? "unknown" },
          { status: 500 }
        );
      }
      sessionId = newSession.id;
    }

    let billId: string;
    let checkoutUrl: string;

    if (existingSession?.bill_id && existingSession?.payment_url) {
      billId = existingSession.bill_id;
      checkoutUrl = existingSession.payment_url;
    } else {
      try {
        const result = await createBillplzBill({
          amountCents: planRow.price_cents,
          description: `Capital Bridge — ${planRow.name}`,
          email: user.email ?? "client@thecapitalbridge.com",
          name: user.email ?? "Capital Bridge Client",
          reference1: sessionId!,
          redirectUrl: process.env.BILLPLZ_REDIRECT_URL ?? "https://platform.thecapitalbridge.com",
        });
        billId = result.billId;
        checkoutUrl = result.checkoutUrl;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown";
        console.error("[api/billing/create] Billplz error:", err);
        const errorCode =
          /expired/i.test(errMsg) ? "payment_expired"
          : /cancel/i.test(errMsg) ? "payment_cancelled"
          : /network|fetch|ECONNREFUSED/i.test(errMsg) ? "network_error"
          : /invalid|404/i.test(errMsg) ? "invalid_bill"
          : "bill_creation_failed";
        await svc
          .schema("public")
          .from("billing_sessions")
          .update({
            last_payment_error: errorCode,
            updated_at: now.toISOString(),
          })
          .eq("id", sessionId);
        return NextResponse.json(
          { error: "bill_creation_failed", detail: errMsg },
          { status: 502 }
        );
      }

      await svc
        .schema("public")
        .from("billing_sessions")
        .update({
          status: "bill_created",
          bill_id: billId,
          payment_url: checkoutUrl,
          updated_at: now.toISOString(),
        })
        .eq("id", sessionId);
    }

    return NextResponse.json({ bill_id: billId, checkoutUrl });
  } catch (err) {
    console.error("[api/billing/create] unexpected error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
