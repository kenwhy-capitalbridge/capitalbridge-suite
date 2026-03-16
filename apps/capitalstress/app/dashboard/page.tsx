import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { AdvisoryShell } from "./AdvisoryShell";

export const dynamic = "force-dynamic";

export default async function CapitalStressDashboard() {
  const supabase = await createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${LOGIN_APP_URL}/login?redirectTo=${encodeURIComponent("https://capitalstress.thecapitalbridge.com/dashboard")}`);
  }

  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .schema("public")
    .from("memberships")
    .select("id, status, end_date, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect(`${LOGIN_APP_URL}/pricing?message=membership_required`);
  }

  return (
    <main>
      <AdvisoryShell userId={user.id}>
        <h1>Capital Stress</h1>
        <p>Capital Stress financial tool — protected. Signed in as {user.email ?? "user"}.</p>
      </AdvisoryShell>
    </main>
  );
}
