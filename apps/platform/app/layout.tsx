import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createAppServerClient } from "@cb/supabase/server";
import "./globals.css";
import { MembershipSessionCheck } from "./components/MembershipSessionCheck";
import { decodeMembershipSafeCookie } from "../lib/safeModeCookie";

export const metadata: Metadata = {
  title: "Capital Bridge Advisory Platform",
  description:
    "Capital Bridge Advisory Platform — institutional-grade capital modelling for income sustainability, risk resilience, and long-term financial structure.",
};

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

  return (
    <html lang="en">
      <body>
        <MembershipSessionCheck initialSafeMode={initialSafeMode} />
        {children}
      </body>
    </html>
  );
}
