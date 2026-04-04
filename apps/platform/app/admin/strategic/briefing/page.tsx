import Link from "next/link";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { StrategicBriefingClient } from "./StrategicBriefingClient";

export const dynamic = "force-dynamic";

export default async function StrategicBriefingPage() {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/");
  }
  if (!isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto", color: "#10261b" }}>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
        <Link href="/admin/strategic" style={{ color: "#0d3a1d", fontWeight: 600 }}>
          ← Strategic interest pipeline
        </Link>
      </p>
      <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
        Strategic briefing (internal)
      </h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.92rem", color: "rgba(16,38,27,0.75)", maxWidth: 720 }}>
        Same access as the pipeline table: only addresses in{" "}
        <code style={{ fontSize: "0.85em" }}>PLATFORM_ADMIN_EMAILS</code> (or{" "}
        <code style={{ fontSize: "0.85em" }}>STRATEGIC_INTEREST_ADMIN_EMAIL</code>). Combines{" "}
        <code style={{ fontSize: "0.85em" }}>public.strategic_interest</code> with{" "}
        <code style={{ fontSize: "0.85em" }}>advisory_v2.advisory_reports</code> so you can see what they
        submitted on the form and the latest saved model inputs/results.
      </p>
      <StrategicBriefingClient />
    </main>
  );
}
