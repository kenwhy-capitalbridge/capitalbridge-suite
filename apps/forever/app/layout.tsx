import type { Metadata } from "next";
import { createAppServerClient } from "@cb/supabase/server";
import { ModelAppHeader } from "@cb/ui";
import { ForeverCalculatorProvider } from "./ForeverCalculatorProvider";
import { ForeverHeaderSaveRestore } from "./dashboard/ForeverHeaderSaveRestore";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forever | Capital Bridge",
  description: "Legacy planning tool — Capital Bridge.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <ForeverCalculatorProvider>
          <ModelAppHeader
            titleDesktop="FOREVER INCOME MODEL"
            titleMobile="FOREVER INCOME"
            actions={user ? <ForeverHeaderSaveRestore userId={user.id} /> : null}
          />
          {children}
        </ForeverCalculatorProvider>
      </body>
    </html>
  );
}
