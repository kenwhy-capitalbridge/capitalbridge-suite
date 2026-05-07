import { Inter, Roboto_Serif } from "next/font/google";
import type { ReactNode } from "react";

const advisorySerif = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cb-advisory-serif",
});

const advisorySans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cb-advisory-sans",
});

export default function SolutionsLayout({ children }: { children: ReactNode }) {
  return <div className={`${advisorySerif.variable} ${advisorySans.variable}`}>{children}</div>;
}
