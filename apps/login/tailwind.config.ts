import type { Config } from "tailwindcss";

/**
 * Capital Bridge Advisory Platform – Design System
 * All pages inherit these tokens; use cb-* utilities for consistency.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "cb-green": "#0D3A1D",
        "cb-gold": "#FFCC6A",
        "cb-gold-dark": "#8B6914",
        "cb-cream": "#F6F5F1",
        "cb-black": "#2B2B2B",
      },
      fontSize: {
        /** Aligned with `packages/ui/src/cb-model-base.css` body tokens */
        "cb-body": [
          "var(--cb-body-font-size)",
          { lineHeight: "var(--cb-body-line-height)" },
        ],
      },
      fontFamily: {
        /** Roboto Serif — loaded in `@cb/ui/cb-model-base.css`; must match `--cb-font-serif`. */
        serif: ["var(--cb-font-serif)"],
        sans: ["var(--cb-font-sans)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
