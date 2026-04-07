#!/usr/bin/env node
/**
 * Copy canonical brand SVGs from packages/ui/src/assets into each app public/brand/
 * so <img src="/brand/..."> and fetch() work everywhere (login, platform, PDF, reports).
 *
 * Source filenames may differ from public URLs (e.g. repo stores GOLD-BiggerFont-Logo-Vertical.svg
 * but HeaderBrandPicture expects BiggerFont-Capital Logo Vertical Transparent.svg).
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "packages/ui/src/assets");

/** [sourceRelativeToSrcDir, destNameInPublicBrand] */
const COPY_SPECS = [
  ["CapitalBridgeLogo_Gold.svg", "CapitalBridgeLogo_Gold.svg"],
  ["CapitalBridgeLogo_Green.svg", "CapitalBridgeLogo_Green.svg"],
  ["lionhead_Gold.svg", "lionhead_Gold.svg"],
  ["lionhead_Green_no_tm.svg", "lionhead_Green.svg"],
  ["lionhead_Gold_no_tm.svg", "lionhead_Gold_no_tm_vector.svg"],
  ["Large-Full_CapitalBridge_Gold.svg", "Full_CapitalBridge_Gold.svg"],
  ["Full_CapitalBridge_Green.svg", "Full_CapitalBridge_Green.svg"],
  ["Large-Full_CapitalBridge_Gold.svg", "Large-Full_CapitalBridge_Gold.svg"],
  ["GOLD-BiggerFont-Logo-Vertical.svg", "BiggerFont-Capital Logo Vertical Transparent.svg"],
];

const apps = [
  "forever",
  "login",
  "platform",
  "capitalhealth",
  "capitalstress",
  "incomeengineering",
];

for (const [srcName] of COPY_SPECS) {
  const p = join(srcDir, srcName);
  if (!existsSync(p)) {
    console.error(`Missing source asset: ${p}`);
    process.exit(1);
  }
}

for (const app of apps) {
  const destDir = join(root, "apps", app, "public", "brand");
  mkdirSync(destDir, { recursive: true });
  for (const [srcName, destName] of COPY_SPECS) {
    cpSync(join(srcDir, srcName), join(destDir, destName));
  }
  console.log(`Synced brand SVGs → apps/${app}/public/brand/`);
}
