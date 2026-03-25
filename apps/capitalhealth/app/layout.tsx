import type { Metadata } from "next";
import { ModelAppHeader } from "@cb/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalHealth | Capital Bridge",
  description: "CapitalHealth advisory tool — Capital Bridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModelAppHeader titleDesktop="CAPITAL HEALTH MODEL" titleMobile="CAPITAL HEALTH" />
        {children}
      </body>
    </html>
  );
}
