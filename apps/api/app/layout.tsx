import type { Metadata } from "next";
import { CbLegalSiteFooter, ElfsightChatbot } from "@cb/ui";
import { CB_SITE_FAVICON_ICONS } from "@cb/ui/siteFaviconMetadata";

export const metadata: Metadata = {
  title: "Capital Bridge API",
  icons: CB_SITE_FAVICON_ICONS,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <CbLegalSiteFooter />
        <ElfsightChatbot />
      </body>
    </html>
  );
}

