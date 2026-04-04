import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { LOGIN_APP_URL, withPricingReturnModel } from "@cb/shared/urls";
import { marketToModelCurrencyPrefix, normalizeMarketId } from "@cb/shared/markets";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";
import { deriveEntitlementsFromRawPlan } from "@cb/advisory-graph";
import { CapitalStressDashboardClient } from "./CapitalStressDashboardClient";

export const dynamic = "force-dynamic";

async function dashboardRedirectTo(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "/dashboard";
  return `${proto}://${host}/dashboard`;
}

export default async function CapitalStressDashboard() {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const target = encodeURIComponent(await dashboardRedirectTo());
    redirect(`${LOGIN_APP_URL}/access?redirectTo=${target}`);
  }

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("first_name, last_name, advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const initialCurrencyLabel =
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

  if (!membership)
    redirect(
      withPricingReturnModel(`${LOGIN_APP_URL}/pricing?message=membership_required`, "capitalstress"),
    );

  const { data: plan } = await supabase
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();
  const ent = deriveEntitlementsFromRawPlan(plan?.slug ?? null);
  const normalizedSlug = String(plan?.slug ?? "").toLowerCase().trim();
  const lionAccessUser: LionAccessUser = {
    isPaid: normalizedSlug !== "trial",
    hasActiveTrialUpgrade: false,
  };

  return (
    <CapitalStressDashboardClient
      advisoryUserId={user.id}
      canUseStressModel={ent.canUseStressModel}
      canSeeVerdict={ent.canSeeVerdict}
      lionAccessUser={lionAccessUser}
      reportClientDisplayName={reportClientDisplayName}
      initialCurrencyLabel={initialCurrencyLabel}
    />
  );
}
