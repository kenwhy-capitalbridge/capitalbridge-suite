import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { LOGIN_APP_URL } from "@cb/shared/urls";

export const dynamic = "force-dynamic";

export default async function CapitalStressHome() {
  const supabase = await createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${LOGIN_APP_URL}/login?redirectTo=${encodeURIComponent("https://capitalstress.thecapitalbridge.com/dashboard")}`);
  }
  redirect("/dashboard");
}
