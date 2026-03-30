/**
 * Report / PDF brand assets (light backgrounds). Sync: `npm run brand:sync` → each app `public/brand/`.
 */

/** Lion only — interior headers, compact marks. */
export function getCapitalBridgeReportLionGreenSrc(): string {
  return "/brand/lionhead_Green.svg";
}

/** Wordmark only — when lion is shown separately. */
export function getCapitalBridgeReportWordmarkGreenSrc(): string {
  return "/brand/CapitalBridgeLogo_Green.svg";
}

/** Full lockup (lion + Capital Bridge) — cover / hero brand mark on light paper. */
export function getCapitalBridgeReportFullGreenSrc(): string {
  return "/brand/Full_CapitalBridge_Green.svg";
}

/**
 * Default single mark for interior / small headers (lion on light background).
 * @deprecated Use `getCapitalBridgeReportLionGreenSrc` or `getCapitalBridgeReportFullGreenSrc` explicitly.
 */
export function getCapitalBridgeReportLogoSrc(): string {
  return getCapitalBridgeReportLionGreenSrc();
}
