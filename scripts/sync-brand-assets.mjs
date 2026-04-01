#!/usr/bin/env node
/**
 * Copy canonical brand SVGs from packages/ui/src/assets into each app public/brand/
 * so <img src="/brand/..."> and fetch() work everywhere (login, platform, PDF, reports).
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "packages/ui/src/assets");
const files = [
  "CapitalBridgeLogo_Gold.svg",
  "CapitalBridgeLogo_Green.svg",
  "lionhead_Gold.svg",
  "lionhead_Green.svg",
  "lionhead_Gold_no_tm_vector.svg",
  "Full_CapitalBridge_Gold.svg",
  "Full_CapitalBridge_Green.svg",
  "Large-Full_CapitalBridge_Gold.svg",
  "BiggerFont-Capital Logo Vertical Transparent.svg",
];
const apps = [
  "forever",
  "login",
  "platform",
  "capitalhealth",
  "capitalstress",
  "incomeengineering",
];

let missing = false;
for (const f of files) {
  const p = join(srcDir, f);
  if (!existsSync(p)) {
    console.error(`Missing source asset: ${p}`);
    missing = true;
  }
}
if (missing) process.exit(1);

for (const app of apps) {
  const destDir = join(root, "apps", app, "public", "brand");
  mkdirSync(destDir, { recursive: true });
  for (const f of files) {
    cpSync(join(srcDir, f), join(destDir, f));
  }
  console.log(`Synced brand SVGs → apps/${app}/public/brand/`);
}
