import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import {
  createAdvisorySessionOnServer,
  serverCanSaveFromMembership,
} from "@cb/advisory-graph/server/membershipLayout";
import { ModelAppHeader } from "@cb/ui";
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
        <ModelSaveHandlersProvider>
          <ModelAppHeader
            titleDesktop="CAPITAL HEALTH MODEL"
            titleMobile="CAPITAL HEALTH"
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
          {children}
        </ModelSaveHandlersProvider>
      </body>
    </html>
  );
}
