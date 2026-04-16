import type { Metadata } from "next";
import "./globals.css";
import { ElfsightChatbot } from "@cb/ui";
import { CB_SITE_FAVICON_ICONS } from "@cb/ui/siteFaviconMetadata";
import Header from "@/components/Header";
import { AuthHelpFooter } from "@/components/AuthHelpFooter";
import { TabCloseSessionClear } from "@/components/TabCloseSessionClear";

export const metadata: Metadata = {
  title: "Capital Bridge — Login",
  description: "Capital Bridge login and onboarding.",
  icons: CB_SITE_FAVICON_ICONS,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <TabCloseSessionClear />
        <Header />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <AuthHelpFooter />
        <ElfsightChatbot />
      </body>
    </html>
  );
}

