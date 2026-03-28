import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";
import { hashTrialCheckoutIp, parseClientIpFromRequest } from "@/lib/trialCheckoutSignals";

export const runtime = "nodejs";

const DEFAULT_LOGIN = "https://login.thecapitalbridge.com";
const DEFAULT_PAYMENT_RETURN_URL = `${DEFAULT_LOGIN}/payment-return`;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  return (
    o === DEFAULT_LOGIN ||
    o.startsWith("https://login.thecapitalbridge.com") ||
    o.startsWith("http://localhost:") ||
    o.startsWith("http://127.0.0.1:")
  );
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : DEFAULT_LOGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("Origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

type Body = { email?: string; plan?: string; name?: string; deviceId?: string };

function getPaymentFirstRedirectUrl(): string {
  return process.env.BILLPLZ_PAYMENT_FIRST_REDIRECT_URL ?? DEFAULT_PAYMENT_RETURN_URL;
}

/**
 * Payment-first: create Auth user + profile (pending), billing_sessions with user_id, then Billplz bill.
 * Webhook confirms payment → membership + set-password email (user already exists).
 */
export async function POST(req: Request) {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const requestedPlan = (body.plan ?? "trial").toString();
  const name = typeof body.name === "string" ? body.name.trim() : email || "Customer";
  const deviceIdRaw = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const deviceId = deviceIdRaw.length > 0 && deviceIdRaw.length <= 128 ? deviceIdRaw : "";
  const checkoutIpHash = hashTrialCheckoutIp(parseClientIpFromRequest(req));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400, headers });
  }

  const svc = createServiceClient();

  const { data: planRow, error: planErr } = await svc
    .schema("public")
    .from("plans")
    .select("id, slug, name, price_cents, duration_days, is_trial")
    .eq("slug", requestedPlan)
    .maybeSingle();

  if (planErr || !planRow) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400, headers });
  }

  if (planRow.is_trial) {
    if (checkoutIpHash) {
      const { data: ipHit } = await svc
        .schema("public")
        .from("trial_consumption_fingerprints")
        .select("id")
        .eq("ip_hash", checkoutIpHash)
        .maybeSingle();
      if (ipHit?.id) {
        return NextResponse.json(
          { error: "trial_unavailable", message: "A trial has already been started from this network. Use your existing account or choose a paid plan." },
          { status: 403, headers }
        );
      }
    }
    if (deviceId) {
      const { data: devHit } = await svc
        .schema("public")
        .from("trial_consumption_fingerprints")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (devHit?.id) {
        return NextResponse.json(
          { error: "trial_unavailable", message: "A trial has already been used on this browser. Sign in with that account or choose a paid plan." },
          { status: 403, headers }
        );
      }
    }
  }

  const tempPassword = randomBytes(28).toString("base64url");
  const { data: authUser, error: createUserErr } = await svc.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: false,
    user_metadata: {
      full_name: name,
      name,
      checkout_pending: true,
    },
  });

  if (createUserErr || !authUser?.user?.id) {
    const msg = String(createUserErr?.message ?? "").toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists") ||
      createUserErr?.code === "email_exists"
    ) {
      return NextResponse.json({ error: "account_exists", detail: "email_already_registered" }, { status: 409, headers });
    }
    console.error("[request-bill] create user failed:", createUserErr);
    return NextResponse.json(
      { error: "user_create_failed", detail: createUserErr?.message },
      { status: 500, headers }
    );
  }

  const userId = authUser.user.id;

  await svc
    .schema("public")
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
      },
      { onConflict: "id" }
    );

  const { data: session, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .insert({
      user_id: userId,
      email,
      plan_id: planRow.id,
      plan: planRow.slug,
      status: "pending",
      payment_attempt_count: 0,
      updated_at: new Date().toISOString(),
      ...(checkoutIpHash ? { checkout_ip_hash: checkoutIpHash } : {}),
      ...(deviceId ? { checkout_device_id: deviceId } : {}),
    })
    .select("id")
    .single();

  if (sessionErr || !session?.id) {
    console.error("[request-bill] billing_sessions insert failed:", sessionErr);
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    const detail = sessionErr?.message ?? (sessionErr as Error)?.message;
    return NextResponse.json(
      { error: "session_create_failed", detail: typeof detail === "string" ? detail : undefined },
      { status: 500, headers }
    );
  }

  if (!process.env.BILLPLZ_CALLBACK_URL) {
    console.warn(
      "[request-bill] BILLPLZ_CALLBACK_URL is not set; Billplz may not call the webhook. Set it to e.g. https://api.thecapitalbridge.com/billing/billplz-webhook so payment creates the user. User can still activate via payment-return (confirm-payment fallback)."
    );
  }

  let billId: string;
  let checkoutUrl: string;
  try {
    const result = await createBillplzBill({
      amountCents: planRow.price_cents,
      description: `Capital Bridge — ${planRow.name}`,
      email,
      name: name || email,
      reference1: session.id,
      redirectUrl: getPaymentFirstRedirectUrl(),
    });
    billId = result.billId;
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    console.error("[request-bill] Billplz error:", err);
    await svc
      .schema("public")
      .from("billing_sessions")
      .update({
        last_payment_error: "bill_creation_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return NextResponse.json({ error: "bill_creation_failed" }, { status: 502, headers });
  }

  // Section 2: Save bill_id, status = bill_created
  await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      bill_id: billId,
      payment_url: checkoutUrl,
      status: "bill_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return NextResponse.json({ checkoutUrl }, { headers });
}
