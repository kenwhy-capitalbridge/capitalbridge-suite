import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { LOGIN_APP_URL, withPricingReturnModel } from "@cb/shared/urls";
import {
  marketToModelCurrencyPrefix,
  normalizeMarketId,
  type MarketId,
} from "@cb/shared/markets";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

export type ForeverDashboardAuthContext = {
  userId: string;
  /** `plans.slug` for the active membership (e.g. trial, forever-income). */
  planSlug: string;
  /** `profiles.advisory_market` — PDF audit timezone + zone label. */
  advisoryMarketId: MarketId;
  reportClientDisplayName: string;
  modelCurrencyPrefix: string | null;
  lionAccessUser: LionAccessUser;
};

/**
 * Shared gate for `/dashboard` and `/dashboard/print` — same membership + Lion tier as the model UI.
 */
export async function requireForeverDashboardAuth(): Promise<ForeverDashboardAuthContext> {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `${LOGIN_APP_URL}/access?redirectTo=${encodeURIComponent("https://forever.thecapitalbridge.com/dashboard")}`,
    );
  }

  const userId = user.id;

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("first_name, last_name, advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const advisoryMarketId = normalizeMarketId(profile?.advisory_market);

  const modelCurrencyPrefix =
    typeof profile?.advisory_market === "string"
      ? marketToModelCurrencyPrefix(normalizeMarketId(profile.advisory_market))
      : null;

  const reportClientDisplayName = reportClientDisplayNameFromAuth({
    email: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
    profile: profile ?? null,
  });

  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .schema("public")
    .from("memberships")
    .select("id, plan_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect(
      withPricingReturnModel(`${LOGIN_APP_URL}/pricing?message=membership_required`, "forever"),
    );
  }

  const { data: plan } = await supabase
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();
  const planSlug = String(plan?.slug ?? "").toLowerCase().trim();
  const lionAccessUser: LionAccessUser = {
    isPaid: planSlug !== "trial",
    hasActiveTrialUpgrade: false,
  };

  return {
    userId,
    planSlug,
    advisoryMarketId,
    reportClientDisplayName,
    modelCurrencyPrefix,
    lionAccessUser,
  };
}
