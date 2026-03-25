import type { Metadata } from "next";
import { ModelAppHeader } from "@cb/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Income Engineering | Capital Bridge",
  description: "Income Engineering planning tool — Capital Bridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModelAppHeader
          titleDesktop="Income Engineering Model"
          titleMobile="Income Engineering"
        />
        {children}
      </body>
    </html>
  );
}
