import { createAppServerClient } from "@cb/supabase/server";
import { AdvisoryShell } from "./AdvisoryShell";

export const dynamic = "force-dynamic";

export default async function CapitalStressDashboard() {
  const supabase = await createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  return (
    <main>
      <AdvisoryShell userId={userId}>
        <h1>Capital Stress</h1>
        <p>
          {user?.email
            ? `Signed in as ${user.email}.`
            : "Open calculator — sign in via the advisory platform to save reports to your account."}
        </p>
      </AdvisoryShell>
    </main>
  );
}
