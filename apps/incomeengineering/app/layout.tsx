import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import {
  createAdvisorySessionOnServer,
  serverCanSaveFromMembership,
} from "@cb/advisory-graph/server/membershipLayout";
import { syncUserActiveSessionFromAccessToken } from "@cb/advisory-graph/server/userActiveSessionSync";
import {
  CbLegalSiteFooter,
  ElfsightChatbot,
  LionWatermarkShell,
  ModelAppHeader,
  ModelMetricSpineProvider,
} from "@cb/ui";
import { CB_SITE_FAVICON_ICONS } from "@cb/ui/siteFaviconMetadata";
import { ModelHeaderSaveRestore } from "@cb/advisory-graph/ModelHeaderSaveRestore";
import { ModelSaveHandlersProvider } from "@cb/advisory-graph/ModelSaveHandlersContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Income Engineering | Capital Bridge",
  description: "Income Engineering planning tool — Capital Bridge.",
  icons: CB_SITE_FAVICON_ICONS,
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
        await syncUserActiveSessionFromAccessToken(u.id, session?.access_token, "[income-engineering layout]");
        canSave = await serverCanSaveFromMembership(supabase, u.id);
        if (canSave) {
          initialSessionId = await createAdvisorySessionOnServer(
            supabase,
            u.id,
            "[income-engineering layout]"
          );
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
              <div className="cb-advisory-model-site-shell flex min-h-screen flex-col">
                <ModelAppHeader
                  titleDesktop="INCOME ENGINEERING"
                  titleMobile="INCOME ENGINE"
                  compactTitle
                  actions={
                    user ? (
                      <ModelHeaderSaveRestore
                        userId={user.id}
                        serverCanSave={canSave}
                        initialSessionId={initialSessionId}
                        logTag="[income-engineering]"
                      />
                    ) : null
                  }
                />
                <div className="cb-advisory-model-main flex min-h-0 flex-col">{children}</div>
                <CbLegalSiteFooter className="mt-auto" />
              </div>
            </ModelMetricSpineProvider>
          </ModelSaveHandlersProvider>
        </LionWatermarkShell>
        <ElfsightChatbot />
      </body>
    </html>
  );
}
