import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvConfig(monorepoRoot, false);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * PDF dev server + Playwright `page.goto` (see `scripts/render-sample-pdf-for-docs.ts`): avoid
   * Next treating `localhost` vs `127.0.0.1` as cross-origin for `/_next/*`.
   */
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@cb/ui"],
  /**
   * `/api/capital-stress/report-pdf/*` → `renderPdf` (Playwright). Same as Forever:
   * keep native unpack / serverless Chromium out of the webpack bundle.
   * Vercel/AWS: `@sparticuz/chromium` (see `packages/pdf/src/renderPdf.ts`).
   * Local Node: install browsers once — `npm run docs:playwright-browsers` at repo root, or `npx playwright install chromium`.
   */
  serverExternalPackages: ["playwright", "@sparticuz/chromium"],
};

export default nextConfig;
