import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvConfig(monorepoRoot, false);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * PDF dev server + Playwright `page.goto`: avoid Next treating `localhost` vs `127.0.0.1` as cross-origin for `/_next/*`.
   */
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@cb/ui"],
  /**
   * `/api/income-engineering/report-pdf/*` → `renderPdf` (Playwright). Keep native unpack / serverless Chromium out of the webpack bundle.
   */
  serverExternalPackages: ["playwright", "@sparticuz/chromium"],
};
export default nextConfig;
