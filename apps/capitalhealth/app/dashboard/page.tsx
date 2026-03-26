import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { CapitalHealthDashboardClient } from "./CapitalHealthDashboardClient";

export const dynamic = "force-dynamic";

function dashboardRedirectTo(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "/dashboard";
  return `${proto}://${host}/dashboard`;
}

export default async function CapitalHealthDashboard() {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const target = encodeURIComponent(dashboardRedirectTo());
    redirect(`${LOGIN_APP_URL}/access?redirectTo=${target}`);
  }

  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect(`${LOGIN_APP_URL}/pricing?message=membership_required`);

  return <CapitalHealthDashboardClient />;
}
