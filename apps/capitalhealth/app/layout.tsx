import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import {
  createAdvisorySessionOnServer,
  serverCanSaveFromMembership,
} from "@cb/advisory-graph/server/membershipLayout";
import { syncUserActiveSessionFromAccessToken } from "@cb/advisory-graph/server/userActiveSessionSync";
import { CbLegalSiteFooter, LionWatermarkShell, ModelAppHeader, ModelMetricSpineProvider } from "@cb/ui";
import { ModelHeaderSaveRestore } from "@cb/advisory-graph/ModelHeaderSaveRestore";
import { ModelSaveHandlersProvider } from "@cb/advisory-graph/ModelSaveHandlersContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalHealth | Capital Bridge",
  description: "CapitalHealth advisory tool — Capital Bridge.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user: { id: string } | null = null;
  let canSave = false;
  let initialSessionId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createAppServerClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u;
      if (u) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await syncUserActiveSessionFromAccessToken(u.id, session?.access_token, "[capital-health layout]");
        canSave = await serverCanSaveFromMembership(supabase, u.id);
        if (canSave) {
          initialSessionId = await createAdvisorySessionOnServer(supabase, u.id, "[capital-health layout]");
        }
      }
    } catch {
      /* build / misconfig */
    }
  }

  return (
    <html lang="en">
      <body>
        <LionWatermarkShell>
          <ModelSaveHandlersProvider>
            <ModelMetricSpineProvider>
              <div className="flex min-h-screen flex-col">
                <ModelAppHeader
                  titleDesktop="CAPITAL HEALTH"
                  titleMobile="CAP. HEALTH"
                  actions={
                    user ? (
                      <ModelHeaderSaveRestore
                        userId={user.id}
                        serverCanSave={canSave}
                        initialSessionId={initialSessionId}
                        logTag="[capital-health]"
                      />
                    ) : null
                  }
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  {/* Same 1280px column + horizontal rhythm as ModelAppHeader inner grid */}
                  <div className="mx-auto box-border flex min-h-0 min-w-0 w-full max-w-[1280px] flex-1 flex-col px-3 sm:px-4 md:px-[clamp(0.65rem,1.8vw,1.1rem)]">
                    {children}
                  </div>
                </div>
                <CbLegalSiteFooter />
              </div>
            </ModelMetricSpineProvider>
          </ModelSaveHandlersProvider>
        </LionWatermarkShell>
      </body>
    </html>
  );
}
