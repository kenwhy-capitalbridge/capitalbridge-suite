import { CbLegalSiteFooter, ElfsightChatbot } from "@cb/ui";

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

