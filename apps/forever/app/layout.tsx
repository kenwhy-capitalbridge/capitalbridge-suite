import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import {
  createAdvisorySessionOnServer,
  serverCanSaveFromMembership,
} from "@cb/advisory-graph/server/membershipLayout";
import { syncUserActiveSessionFromAccessToken } from "@cb/advisory-graph/server/userActiveSessionSync";
import { PLATFORM_APP_URL } from "@cb/shared/urls";
import { ModelAppHeader } from "@cb/ui";
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

  const platformHome = `${PLATFORM_APP_URL.replace(/\/+$/, "")}/`;

  return (
    <html lang="en">
      <body>
        <ForeverCalculatorProvider>
          <ModelAppHeader
            titleDesktop="FOREVER INCOME MODEL"
            titleMobile="FOREVER INCOME"
            backHref={platformHome}
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
        </ForeverCalculatorProvider>
      </body>
    </html>
  );
}
