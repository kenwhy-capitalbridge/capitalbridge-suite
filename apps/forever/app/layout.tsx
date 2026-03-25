import type { Metadata } from "next";
import { ModelAppHeader } from "@cb/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forever | Capital Bridge",
  description: "Legacy planning tool — Capital Bridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModelAppHeader titleDesktop="Forever Income Model" titleMobile="Forever Income" />
        {children}
      </body>
    </html>
  );
}
