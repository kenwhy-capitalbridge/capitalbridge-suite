import type { Metadata } from "next";
import favicon from "./assets/Favicon.png";

/** Shared favicon for all Capital Bridge web apps (from `src/assets/Favicon.png`). */
export const CB_SITE_FAVICON_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [{ url: favicon.src, type: "image/png" }],
  apple: [{ url: favicon.src, type: "image/png" }],
};
