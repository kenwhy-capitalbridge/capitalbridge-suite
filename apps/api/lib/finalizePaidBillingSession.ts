import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMarketId } from "@cb/shared/markets";
import { activateMembershipFromPaidBillingSession } from "@/lib/activateMembershipFromBillingSession";

export type FinalizePaidBillingResult =
  | { ok: true; kind: "market_change" }
  | { ok: true; kind: "membership"; membershipId: string }
  | { ok: false; error: string };

/**
 * After Billplz marks a session paid and the user is resolved: either apply a region top-up
 * (no new membership) or activate/link membership and set advisory_market on first purchase.
 */
export async function finalizePaidBillingSession(params: {
  svc: SupabaseClient;
  billingSessionId: string;
  userId: string;
  userEmail: string;
  checkoutMetadata: Record<string, unknown> | null;
}): Promise<FinalizePaidBillingResult> {
  const meta = params.checkoutMetadata ?? {};
  const intent = typeof meta.intent === "string" ? meta.intent.trim() : "";

  if (intent === "market_change") {
    const toRaw = typeof meta.to_market === "string" ? meta.to_market : "";
    const toMarket = normalizeMarketId(toRaw);
    const { error } = await params.svc
      .schema("public")
      .from("profiles")
      .upsert(
        { id: params.userId, email: params.userEmail.trim(), advisory_market: toMarket },
        { onConflict: "id" }
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true, kind: "market_change" };
  }

  const marketFromCheckout = typeof meta.market === "string" ? normalizeMarketId(meta.market) : null;

  await params.svc
    .schema("public")
    .from("profiles")
    .upsert({ id: params.userId, email: params.userEmail.trim() }, { onConflict: "id" });

  if (marketFromCheckout) {
    await params.svc
      .schema("public")
      .from("profiles")
      .update({ advisory_market: marketFromCheckout })
      .eq("id", params.userId)
      .is("advisory_market", null);
  }

  const activate = await activateMembershipFromPaidBillingSession({
    svc: params.svc,
    billingSessionId: params.billingSessionId,
    userId: params.userId,
  });

  if (!activate.ok || !activate.membershipId) {
    return { ok: false, error: activate.ok ? "membership_missing" : activate.error };
  }
  return { ok: true, kind: "membership", membershipId: activate.membershipId };
}
