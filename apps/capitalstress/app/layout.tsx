import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalStress | Capital Bridge",
  description: "CapitalStress financial tool — Capital Bridge Advisory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
