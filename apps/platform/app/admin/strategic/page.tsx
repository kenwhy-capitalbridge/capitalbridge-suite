import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { loadStrategicInterestAdminRows } from "@/lib/strategicInterestAdminLoad";
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
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1rem" }}>Strategic interest</h1>
      <StrategicInterestAdminTable initialRows={rows} />
    </main>
  );
}
