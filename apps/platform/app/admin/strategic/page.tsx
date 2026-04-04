import Link from "next/link";
import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { isAdminPasswordGateEnabled } from "@/lib/platformAdminGateShared";
import { loadStrategicInterestAdminRows } from "@/lib/strategicInterestAdminLoad";
import { AdminGateSignOut } from "./AdminGateSignOut";
import { StrategicInterestAdminTable } from "./StrategicInterestAdminTable";

export const dynamic = "force-dynamic";

export default async function StrategicAdminPage() {
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

  const svc = createServiceClient();
  const { rows, error } = await loadStrategicInterestAdminRows(svc);

  if (error) {
    return (
      <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto", color: "#10261b" }}>
        <p>Unable to load strategic interest records.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto", color: "#10261b" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Strategic interest</h1>
      {isAdminPasswordGateEnabled() ? <AdminGateSignOut /> : null}
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        <Link href="/admin/strategic/briefing" style={{ color: "#0d3a1d", fontWeight: 600 }}>
          Open strategic briefing (user list + model snapshots)
        </Link>
      </p>
      <StrategicInterestAdminTable initialRows={rows} />
    </main>
  );
}
