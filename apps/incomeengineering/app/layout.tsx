import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Income Engineering | Capital Bridge",
  description: "Income Engineering planning tool — Capital Bridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
