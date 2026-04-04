import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { LOGIN_APP_URL, withPricingReturnModel } from "@cb/shared/urls";
import { marketToModelCurrencyPrefix, normalizeMarketId } from "@cb/shared/markets";
import { CURRENCY_LIST, type CurrencyCode } from "../../legacy/config/currency";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";
import { IncomeEngineeringDashboardClient } from "./IncomeEngineeringDashboardClient";

export const dynamic = "force-dynamic";

async function dashboardRedirectTo(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "/dashboard";
  return `${proto}://${host}/dashboard`;
}

export default async function IncomeEngineeringDashboard() {
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

  const prefixFromProfile =
    typeof profile?.advisory_market === "string"
      ? marketToModelCurrencyPrefix(normalizeMarketId(profile.advisory_market))
      : null;
  const initialCurrencyCode: CurrencyCode | undefined =
    prefixFromProfile && (CURRENCY_LIST as readonly string[]).includes(prefixFromProfile)
      ? (prefixFromProfile as CurrencyCode)
      : undefined;

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
      withPricingReturnModel(`${LOGIN_APP_URL}/pricing?message=membership_required`, "incomeengineering"),
    );

  const { data: plan } = await supabase
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();
  const normalizedSlug = String(plan?.slug ?? "").toLowerCase().trim();
  const lionAccessUser: LionAccessUser = {
    isPaid: normalizedSlug !== "trial",
    hasActiveTrialUpgrade: false,
  };

  return (
    <IncomeEngineeringDashboardClient
      lionAccessUser={lionAccessUser}
      reportClientDisplayName={reportClientDisplayName}
      initialCurrencyCode={initialCurrencyCode}
    />
  );
}
