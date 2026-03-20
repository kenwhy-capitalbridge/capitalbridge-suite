import type { Metadata } from "next";
import "./globals.css";
import { MembershipSessionCheck } from "./components/MembershipSessionCheck";

export const metadata: Metadata = {
  title: "Capital Bridge Advisory Platform",
  description:
    "Capital Bridge Advisory Platform — institutional-grade capital modelling for income sustainability, risk resilience, and long-term financial structure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MembershipSessionCheck />
        {children}
      </body>
    </html>
  );
}

