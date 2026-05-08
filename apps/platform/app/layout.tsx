import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Tinos } from "next/font/google";
import { createAppServerClient } from "@cb/supabase/server";
import { isStagingCapitalBridgeHost, normalizeRequestHost } from "@cb/shared/staging";
import "./globals.css";

const cbFrameworkFont = Tinos({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cb-framework",
});
import { CbLegalSiteFooter, ElfsightChatbot } from "@cb/ui";
import { CB_SITE_FAVICON_ICONS } from "@cb/ui/siteFaviconMetadata";
import { MembershipSessionCheck } from "./components/MembershipSessionCheck";
import { decodeMembershipSafeCookie } from "../lib/safeModeCookie";
import { hideGlobalLegalSiteFooter } from "../lib/dashboardFooterRoute";

const BASE_METADATA: Metadata = {
  title: "Capital Bridge Advisory Platform",
  description:
    "Capital Bridge Advisory Platform — institutional-grade capital modelling for income sustainability, risk resilience, and long-term financial structure.",
  icons: CB_SITE_FAVICON_ICONS,
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = normalizeRequestHost(h.get("host"));
  if (!isStagingCapitalBridgeHost(host)) {
    return BASE_METADATA;
  }
  return {
    ...BASE_METADATA,
    title: "Capital Bridge — Staging",
    robots: { index: false, follow: false },
  };
}

const CB_MBR_SAFE = "cb_mbr_safe";

async function readInitialSafeMode(): Promise<boolean> {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const cookieStore = await cookies();
    const safeDecoded = decodeMembershipSafeCookie(cookieStore.get(CB_MBR_SAFE)?.value);
    const nowSec = Math.floor(Date.now() / 1000);
    return Boolean(safeDecoded && safeDecoded.userId === user.id && safeDecoded.expSec > nowSec);
  } catch {
    return false;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialSafeMode = await readInitialSafeMode();
  const h = await headers();
  const pathname = h.get("x-cb-pathname") ?? "";
  const hideGlobalLegalFooter = hideGlobalLegalSiteFooter(pathname);

  return (
    <html lang="en" className={cbFrameworkFont.variable}>
      <body className="flex min-h-screen flex-col">
        <MembershipSessionCheck initialSafeMode={initialSafeMode} />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {hideGlobalLegalFooter ? null : <CbLegalSiteFooter />}
        <ElfsightChatbot />
      </body>
    </html>
  );
}
