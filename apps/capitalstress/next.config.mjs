import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvConfig(monorepoRoot, false);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@cb/ui"],
};

export default nextConfig;
