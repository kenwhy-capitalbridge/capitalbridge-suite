import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";

export const runtime = "nodejs";

/** Reuse existing session/bill if within this window (ms). Prevents duplicate bills on retry/refresh. */
const SESSION_REUSE_MS = 24 * 60 * 60 * 1000; // 24 hours

type Body = { plan?: string };

function logBillingEvent(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  payload: { event_type: string; user_id?: string; membership_id?: string; payment_id?: string; metadata?: Record<string, unknown> }
) {
  return svc.schema("public").from("billing_events").insert({
    event_type: payload.event_type,
    user_id: payload.user_id ?? null,
    membership_id: payload.membership_id ?? null,
    payment_id: payload.payment_id ?? null,
    metadata: (payload.metadata ?? null) as Record<string, unknown> | null,
  }).then(() => {}, () => {});
}

/**
 * Idempotent billing: one billing session = at most one bill, one payment, one membership activation.
 * Reuses existing session/bill when user retries or refreshes within SESSION_REUSE_MS.
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

    // --- PART 2: Idempotent bill creation — reuse existing session/bill when valid ---
    const { data: existingSession } = await svc
      .schema("public")
      .from("billing_sessions")
      .select("id, status, bill_id, payment_url, membership_id, created_at, payment_attempt_count")
      .eq("user_id", user.id)
      .eq("plan_id", planRow.id)
      .in("status", ["pending", "bill_created"])
      .gte("created_at", reuseCutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Diagnostics: increment payment attempt count when touching this session
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
      logBillingEvent(svc, {
        event_type: "bill_reused",
        user_id: user.id,
        metadata: { billing_session_id: existingSession.id, bill_id: existingSession.bill_id, plan: requestedPlan },
      });
      // Ensure payment row exists (in case first request failed after creating bill)
      if (existingSession.membership_id) {
        await svc.schema("public").from("payments").upsert(
          {
            membership_id: existingSession.membership_id,
            billplz_bill_id: existingSession.bill_id,
            billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
            status: "pending",
            amount_cents: planRow.price_cents,
            billing_session_id: existingSession.id,
          },
          { onConflict: "membership_id" }
        );
      }
      return NextResponse.json({ bill_id: existingSession.bill_id, checkoutUrl: existingSession.payment_url });
    }

    // --- Get or create membership (one pending per user+plan) ---
    let membershipId = existingSession?.membership_id ?? null;
    if (!membershipId) {
      const { data: existingPending } = await svc
        .schema("public")
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("plan_id", planRow.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      membershipId = existingPending?.id ?? null;
    }

    if (!membershipId) {
      const { data: created, error: createErr } = await svc
        .schema("public")
        .from("memberships")
        .insert({
          user_id: user.id,
          plan_id: planRow.id,
          status: "pending",
        })
        .select("id")
        .single();

      if (createErr || !created?.id) {
        const message = createErr?.message ?? "no id returned";
        console.error("[api/billing/create] membership insert failed:", createErr?.code, message);
        return NextResponse.json(
          { error: "membership_create_failed", detail: message },
          { status: 500 }
        );
      }
      membershipId = created.id;
      logBillingEvent(svc, {
        event_type: "membership_created",
        user_id: user.id,
        membership_id: membershipId,
        metadata: { plan: requestedPlan },
      });
    }

    // --- Get or create billing session ---
    let sessionId = existingSession?.id ?? null;
    if (!sessionId) {
      const { data: newSession, error: sessionErr } = await svc
        .schema("public")
        .from("billing_sessions")
        .insert({
          user_id: user.id,
          email: user.email ?? "",
          plan_id: planRow.id,
          status: "pending",
          membership_id: membershipId,
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
      logBillingEvent(svc, {
        event_type: "session_created",
        user_id: user.id,
        metadata: { billing_session_id: sessionId, plan: requestedPlan },
      });
    } else if (existingSession?.membership_id !== membershipId) {
      await svc
        .schema("public")
        .from("billing_sessions")
        .update({ membership_id: membershipId, updated_at: now.toISOString() })
        .eq("id", sessionId);
    }

    // --- Create Billplz bill (only if session does not already have one) ---
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
          reference1: membershipId!,
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

      // SECTION 6: Store state in membership table — pending → bill_created
      await svc
        .schema("public")
        .from("memberships")
        .update({ status: "bill_created" })
        .eq("id", membershipId!);

      logBillingEvent(svc, {
        event_type: "bill_created",
        user_id: user.id,
        metadata: { billing_session_id: sessionId, bill_id: billId, plan: requestedPlan },
      });
    }

    // --- Payment record (upsert by membership_id); link to billing_session for audit ---
    const { error: payErr } = await svc.schema("public").from("payments").upsert(
      {
        membership_id: membershipId,
        billplz_bill_id: billId,
        billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
        status: "pending",
        amount_cents: planRow.price_cents,
        billing_session_id: sessionId,
      },
      { onConflict: "membership_id" }
    );

    if (payErr) {
      console.error("[api/billing/create] payment upsert failed:", payErr);
      return NextResponse.json(
        { error: "payment_record_failed", detail: payErr.message },
        { status: 500 }
      );
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
