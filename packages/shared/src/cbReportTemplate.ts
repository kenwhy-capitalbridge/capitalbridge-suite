/**
 * Cross-app defaults for client PDF / print reports (Capital Health react-pdf first; others can import).
 * Brand files: sync from packages/ui via `npm run brand:sync` → each app serves `/brand/*.svg`.
 */

export const CB_REPORT_INK_GREEN = "#0D3A1D";
export const CB_REPORT_GOLD = "#FFCC6A";

/** Outer margin from physical page edge (mm) — comfortable A4 print/view. */
export const CB_REPORT_PAGE_MARGIN_MM = 18;

/** Gold frame stroke inside the margin (pt). */
export const CB_REPORT_FRAME_BORDER_PT = 3;

/** Inner padding inside gold frame (pt). */
export const CB_REPORT_FRAME_PADDING_PT = 14;

/** Reserved space at bottom of frame for pagination (pt). */
export const CB_REPORT_FOOTER_RESERVE_PT = 32;

/** Public URLs when `baseUrl` is the app origin (e.g. https://app.example or http://localhost:3004). */
export const CB_REPORT_BRAND_LION_GREEN_PATH = "/brand/lionhead_Green.svg";
export const CB_REPORT_BRAND_WORDMARK_GREEN_PATH = "/brand/CapitalBridgeLogo_Green.svg";
export const CB_REPORT_BRAND_FULL_GREEN_PATH = "/brand/Full_CapitalBridge_Green.svg";

export const CB_REPORT_FIRM_ADDRESS_LINES = [
  "CAPITAL BRIDGE",
  "No. 6, Jalan Kia Peng,",
  "50450 Kuala Lumpur, Malaysia.",
  "Tel: +603-2789 4810",
  "contact@thecapitalbridge.com",
] as const;

/** mm → pt at 72 dpi print convention */
export function cbReportMmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}
