import { redirect } from "next/navigation";
import { createAppServerClient } from "@cb/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { isAdminPasswordGateEnabled } from "@/lib/platformAdminGateShared";
import { verifyAdminGateCookieValue } from "@/lib/platformAdminGate.server";
import { cookies } from "next/headers";
import { CB_PLATFORM_ADMIN_GATE_COOKIE } from "@/lib/platformAdminGateShared";
import { AdminLoginClient } from "./AdminLoginClient";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
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

  const sp = searchParams ? await searchParams : undefined;
  const nextRaw = sp?.next;
  const nextPath =
    typeof nextRaw === "string" && nextRaw.startsWith("/admin") && !nextRaw.startsWith("/admin/login")
      ? nextRaw
      : "/admin/strategic";

  if (isAdminPasswordGateEnabled()) {
    const jar = await cookies();
    const token = jar.get(CB_PLATFORM_ADMIN_GATE_COOKIE)?.value;
    const payload = verifyAdminGateCookieValue(token);
    const email = user.email.trim().toLowerCase();
    if (payload && payload.uid === user.id && payload.email === email) {
      redirect(nextPath);
    }
  } else {
    redirect(nextPath);
  }

  return (
    <main style={{ padding: "1.75rem", maxWidth: 480, margin: "0 auto", color: "#10261b" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Platform admin</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "rgba(16,38,27,0.75)", lineHeight: 1.55 }}>
        Enter the password from <code style={{ fontSize: "0.85em" }}>PLATFORM_ADMIN_PASSWORDS</code> on Vercel.
        You must already be signed in with an address listed in{" "}
        <code style={{ fontSize: "0.85em" }}>PLATFORM_ADMIN_EMAILS</code>.
      </p>
      <AdminLoginClient nextPath={nextPath} />
    </main>
  );
}
