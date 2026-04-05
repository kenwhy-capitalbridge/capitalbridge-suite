/**
 * STEP 2 audit: confirm Lion copy + both SVGs resolve (absolute, env root, or auto repo root).
 * Run from repo root: node node_modules/tsx/dist/cli.mjs packages/pdf/scripts/verify-forever-report-assets.ts
 */
import {
  assertForeverReportAssetsResolvable,
  loadForeverReportLogoFooterDataUri,
  loadForeverReportLionCopyText,
} from "../src/foreverReportAssets";

assertForeverReportAssetsResolvable();
const copy = loadForeverReportLionCopyText();
const uri = loadForeverReportLogoFooterDataUri();
if (copy.length < 10) throw new Error("Lion copy file unexpectedly short");
if (!uri.startsWith("data:image/svg+xml;base64,")) throw new Error("Footer logo data URI malformed");
console.log("OK: forever report assets load (lion copy chars=%d, footer data URI chars=%d)", copy.length, uri.length);
