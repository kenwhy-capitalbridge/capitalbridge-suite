import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { reportClientDisplayNameFromAuth } from "@cb/shared/reportIdentity";
import { LOGIN_APP_URL, withPricingReturnModel } from "@cb/shared/urls";
import { isGitexGuidedAccess } from "@cb/shared/gitexCampaign";
import { marketToModelCurrencyPrefix, normalizeMarketId } from "@cb/shared/markets";
import { CURRENCY_LIST, type CurrencyCode } from "../../legacy/config/currency";
import { lionAccessUserFromPlanSlug } from "../../../../packages/lion-verdict/access";
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
    .select("first_name, last_name, advisory_market, access_type")
    .eq("id", user.id)
    .maybeSingle();

  const gitexGuided = isGitexGuidedAccess(profile?.access_type as string | null | undefined);

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
  const lionAccessUser = lionAccessUserFromPlanSlug(normalizedSlug);

  return (
    <>
      {gitexGuided ? (
        <div
          style={{
            width: "100%",
            padding: "0.65rem 1rem",
            backgroundColor: "rgba(13, 58, 29, 0.08)",
            borderBottom: "1px solid rgba(13, 58, 29, 0.15)",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#0d3a1d",
          }}
        >
          GITEX Asia 2026 — Guided access: explore the model below. Full analytical depth and PDF reports require a
          standard membership.
        </div>
      ) : null}
      <IncomeEngineeringDashboardClient
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        initialCurrencyCode={initialCurrencyCode}
      />
    </>
  );
}
