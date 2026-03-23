import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { AuthHelpFooter } from "@/components/AuthHelpFooter";

export const metadata: Metadata = {
  title: "Capital Bridge — Login",
  description: "Capital Bridge login and onboarding.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <AuthHelpFooter />
      </body>
    </html>
  );
}

