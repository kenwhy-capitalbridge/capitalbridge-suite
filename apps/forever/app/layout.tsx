import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import {
  createAdvisorySessionOnServer,
  serverCanSaveFromMembership,
} from "@cb/advisory-graph/server/membershipLayout";
import { syncUserActiveSessionFromAccessToken } from "@cb/advisory-graph/server/userActiveSessionSync";
import { platformBackThroughSessionSyncUrl } from "@cb/shared/urls";
import { LionWatermarkShell, ModelAppHeader, ModelMetricSpineProvider } from "@cb/ui";
import { ModelHeaderSaveRestore } from "@cb/advisory-graph/ModelHeaderSaveRestore";
import { ForeverCalculatorProvider } from "./ForeverCalculatorProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forever | Capital Bridge",
  description: "Legacy planning tool — Capital Bridge.",
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
        await syncUserActiveSessionFromAccessToken(u.id, session?.access_token, "[forever layout]");
        canSave = await serverCanSaveFromMembership(supabase, u.id);
        if (canSave) {
          initialSessionId = await createAdvisorySessionOnServer(supabase, u.id, "[forever layout]");
        }
      }
    } catch {
      /* build / misconfig */
    }
  }

  /**
   * Always link to production platform hub (not PLATFORM_APP_URL) so a mis-set Forever env
   * cannot point Back at login or another host. Local dev: set NEXT_PUBLIC_FOREVER_BACK_TO_PLATFORM_URL.
   */
  const foreverBackRaw = process.env.NEXT_PUBLIC_FOREVER_BACK_TO_PLATFORM_URL?.trim();
  const foreverBackToPlatformHref = foreverBackRaw
    ? `${foreverBackRaw.replace(/\/+$/, "")}/api/sync-user-active-session?next=${encodeURIComponent("/")}`
    : platformBackThroughSessionSyncUrl("/");

  return (
    <html lang="en">
      <body>
        <LionWatermarkShell>
          <ForeverCalculatorProvider>
            <ModelMetricSpineProvider>
              <ModelAppHeader
                titleDesktop="FOREVER INCOME"
                titleMobile="FOREVER INC."
                backHref={foreverBackToPlatformHref}
                actions={
                  user ? (
                    <ModelHeaderSaveRestore
                      userId={user.id}
                      serverCanSave={canSave}
                      initialSessionId={initialSessionId}
                      logTag="[forever]"
                    />
                  ) : null
                }
              />
              {children}
            </ModelMetricSpineProvider>
          </ForeverCalculatorProvider>
        </LionWatermarkShell>
      </body>
    </html>
  );
}
