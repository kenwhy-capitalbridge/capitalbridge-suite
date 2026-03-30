import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./legacy/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/lion-verdict/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
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
        "cb-body": [
          "var(--cb-body-font-size)",
          { lineHeight: "var(--cb-body-line-height)" },
        ],
      },
      fontFamily: {
        sans: ["var(--cb-font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--cb-font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
