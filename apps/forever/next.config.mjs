import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvConfig(monorepoRoot, false);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Mock PDF / Playwright use `FOREVER_DEV_URL=http://127.0.0.1:3006`; Next dev otherwise treats
   * `/_next/*` as cross-origin vs the default `localhost` allowlist and logs a warning (future: block).
   */
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@cb/ui"],
  /** Playwright + serverless Chromium ship native/unpack logic — must not be webpack-bundled. */
  serverExternalPackages: ["playwright", "@sparticuz/chromium"],
};
export default nextConfig;
