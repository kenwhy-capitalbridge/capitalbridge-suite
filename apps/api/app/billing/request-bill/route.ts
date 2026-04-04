import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";
import { hashTrialCheckoutIp, parseClientIpFromRequest } from "@/lib/trialCheckoutSignals";
import { parseRequestCountryCode } from "@/lib/requestGeo";
import {
  getBillplzChargeAmountSen,
  normalizeMarketId,
  validateBillingRegionForRequest,
  type MarketId,
} from "@cb/shared/markets";

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

type Body = {
  email?: string;
  plan?: string;
  /** @deprecated use firstName + lastName */
  name?: string;
  firstName?: string;
  lastName?: string;
  deviceId?: string;
  /** ISO country (checkout) e.g. MY, SG */
  checkoutCountry?: string;
  /** E.164-style or national+dial context */
  checkoutPhone?: string;
  /** Advisory market MY | SG | TH | … */
  market?: string;
};

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
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const billplzName = `${firstName} ${lastName}`.trim();
  const deviceIdRaw = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const deviceId = deviceIdRaw.length > 0 && deviceIdRaw.length <= 128 ? deviceIdRaw : "";
  const checkoutIpHash = hashTrialCheckoutIp(parseClientIpFromRequest(req));
  const checkoutCountry =
    typeof body.checkoutCountry === "string" ? body.checkoutCountry.trim().slice(0, 8) : "";
  const checkoutPhone = typeof body.checkoutPhone === "string" ? body.checkoutPhone.trim().slice(0, 32) : "";
  const marketRaw = typeof body.market === "string" ? body.market.trim().slice(0, 8) : "";
  const ipCountry = parseRequestCountryCode(req);
  const allowAnyRegion = process.env.BILLING_ALLOW_ANY_REGION === "1";
  let billingMarket: MarketId;
  if (allowAnyRegion) {
    billingMarket = normalizeMarketId(marketRaw || null);
  } else {
    const region = validateBillingRegionForRequest({
      ipCountry,
      clientMarket: marketRaw,
      checkoutCountry,
      requireCheckoutCountry: true,
    });
    if (!region.ok) {
      const status =
        region.code === "checkout_country_required" || region.code === "invalid_checkout_country" ? 400 : 403;
      return NextResponse.json({ error: region.code }, { status, headers });
    }
    billingMarket = region.market;
  }
  const billAmountSen = getBillplzChargeAmountSen(billingMarket, requestedPlan);
  const checkoutMetadata: Record<string, string> = {
    bill_amount_sen: String(billAmountSen),
    bill_currency: "MYR",
    bill_market: billingMarket,
    ...(checkoutCountry ? { country: checkoutCountry } : {}),
    ...(checkoutPhone ? { phone: checkoutPhone } : {}),
    market: billingMarket,
    ip_country: ipCountry ?? "",
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400, headers });
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      {
        error: "name_required",
        detail: "first_name_and_last_name_required",
        message: "First name and last name are required.",
      },
      { status: 400, headers }
    );
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

  const { data: session, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .insert({
      email,
      plan_id: planRow.id,
      plan: planRow.slug,
      status: "pending",
      payment_attempt_count: 0,
      updated_at: new Date().toISOString(),
      ...(checkoutIpHash ? { checkout_ip_hash: checkoutIpHash } : {}),
      ...(deviceId ? { checkout_device_id: deviceId } : {}),
      checkout_metadata: checkoutMetadata,
    })
    .select("id")
    .single();

  if (sessionErr || !session?.id) {
    console.error("[request-bill] billing_sessions insert failed:", sessionErr);
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
      amountCents: billAmountSen,
      description: `Capital Bridge — ${planRow.name}`,
      email,
      name: billplzName,
      reference1: session.id,
      redirectUrl: getPaymentFirstRedirectUrl(),
    });
    billId = result.billId;
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;
    const bodyText =
      err && typeof err === "object" && "body" in err && typeof (err as { body?: unknown }).body === "string"
        ? ((err as { body: string }).body || "")
        : "";
    const message = err instanceof Error ? err.message : "unknown";
    const providerOffline = status === 503 || /offline for maintenance|undergoing maintenance/i.test(bodyText);

    console.error("[request-bill] Billplz error:", message, status ? { status } : "", bodyText ? { billplz_response: bodyText } : "");
    await svc
      .schema("public")
      .from("billing_sessions")
      .update({
        last_payment_error: providerOffline ? "provider_maintenance" : "bill_creation_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    await svc.schema("public").from("billing_sessions").delete().eq("id", session.id);
    return NextResponse.json(
      {
        error: "bill_creation_failed",
        message: providerOffline
          ? "Payments are temporarily unavailable because our payment provider is under maintenance. Please try again shortly."
          : "We couldn't start payment right now. Please try again shortly.",
      },
      { status: 502, headers }
    );
  }

  const { error: pendingBillErr } = await svc
    .schema("public")
    .from("pending_bills")
    .insert({
      email,
      plan_id: planRow.id,
      name: billplzName,
      billplz_bill_id: billId,
    });

  if (pendingBillErr) {
    console.warn("[request-bill] pending_bills insert failed:", pendingBillErr.message);
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

  return NextResponse.json({ checkoutUrl, billId }, { headers });
}
