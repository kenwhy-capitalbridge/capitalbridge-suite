"use client";

import type { ReactNode } from "react";

export type PdfSectionProps = {
  children: ReactNode;
  /** Appended after the required `cb-page` class (Forever / advisory PDF template). */
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"section">, "className" | "children">;

/**
 * Standard printed page column — always includes `cb-page` for `@cb/advisory-graph` PDF CSS.
 * Do not replace with ad-hoc `<section>` wrappers in model reports.
 */
export function PdfSection({ children, className = "", ...rest }: PdfSectionProps) {
  return (
    <section className={["cb-page", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </section>
  );
}
