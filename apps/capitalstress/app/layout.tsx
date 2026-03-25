import type { Metadata } from "next";
import { ModelAppHeader } from "@cb/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalStress | Capital Bridge",
  description: "CapitalStress financial tool — Capital Bridge Advisory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModelAppHeader titleDesktop="CAPITAL STRESS MODEL" titleMobile="CAPITAL STRESS" />
        {children}
      </body>
    </html>
  );
}
