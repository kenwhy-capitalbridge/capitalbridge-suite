import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";
import { ForeverDashboardClient } from "./ForeverDashboardClient";

export const dynamic = "force-dynamic";

export default async function ForeverDashboard() {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `${LOGIN_APP_URL}/access?redirectTo=${encodeURIComponent("https://forever.thecapitalbridge.com/dashboard")}`
    );

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

  if (!membership) redirect(`${LOGIN_APP_URL}/pricing?message=membership_required`);

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
    <main>
      <ForeverDashboardClient lionAccessUser={lionAccessUser} />
    </main>
  );
}
