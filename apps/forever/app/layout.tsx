import type { Metadata } from "next";
import { deriveEntitlementsFromRawPlan } from "@cb/advisory-graph";
import { createAppServerClient } from "@cb/supabase/server";
import { ModelAppHeader } from "@cb/ui";
import { ForeverCalculatorProvider } from "./ForeverCalculatorProvider";
import { ForeverHeaderSaveRestore } from "./dashboard/ForeverHeaderSaveRestore";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forever | Capital Bridge",
  description: "Legacy planning tool — Capital Bridge.",
};

async function serverCanSaveFromMembership(
  supabase: Awaited<ReturnType<typeof createAppServerClient>>,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .schema("public")
    .from("memberships")
    .select("plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(1)
    .maybeSingle();
  if (!membership?.plan_id) return false;
  const { data: plan } = await supabase
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();
  return deriveEntitlementsFromRawPlan(plan?.slug ?? null).canSaveToServer;
}

/** Server-side session row so the header has a session id even if /api/advisory-session fails in the browser. */
async function createAdvisorySessionOnServer(
  supabase: Awaited<ReturnType<typeof createAppServerClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .schema("advisory_v2")
    .from("advisory_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) {
    console.error("[forever layout] advisory_sessions:", error.message);
    return null;
  }
  return data?.id ? String(data.id) : null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canSave = user ? await serverCanSaveFromMembership(supabase, user.id) : false;
  const initialSessionId =
    user && canSave ? await createAdvisorySessionOnServer(supabase, user.id) : null;

  return (
    <html lang="en">
      <body>
        <ForeverCalculatorProvider>
          <ModelAppHeader
            titleDesktop="FOREVER INCOME MODEL"
            titleMobile="FOREVER INCOME"
            actions={
              user ? (
                <ForeverHeaderSaveRestore
                  userId={user.id}
                  serverCanSave={canSave}
                  initialSessionId={initialSessionId}
                />
              ) : null
            }
          />
          {children}
        </ForeverCalculatorProvider>
      </body>
    </html>
  );
}
