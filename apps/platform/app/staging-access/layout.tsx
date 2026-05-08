import { Inter, Roboto_Serif } from "next/font/google";
import type { ReactNode } from "react";

const stagingSerif = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-staging-serif",
});

const stagingSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-staging-sans",
});

/**
 * Staging gate uses the same institutional typography as advisory dashboards.
 */
export default function StagingAccessLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${stagingSerif.variable} ${stagingSans.variable} min-h-screen antialiased`}
      style={{
        fontFamily: 'var(--font-staging-sans), "Inter", system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
