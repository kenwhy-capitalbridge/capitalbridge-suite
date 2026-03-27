/**
 * Lion’s Verdict + shared advisory report design system (print-first, readability over decoration).
 * Brand green matches the official logo; use for headings, rules, and primary chart/gauge accents.
 */

/** Official logo / Lion’s Verdict primary green */
export const REPORT_BRAND_GREEN = '#1B4D3E';
/** Body copy — high contrast on white */
export const REPORT_TEXT = '#0D3A1D';
export const REPORT_ACCENT = '#C6A24D';
export const REPORT_BORDER = 'rgba(27, 77, 62, 0.22)';
export const REPORT_MUTED = 'rgba(13, 58, 29, 0.78)';
export const REPORT_BG = '#ffffff';

/** Brand tagline (use in alt text / accessibility; omit under logo if already in artwork). */
export const REPORT_BRAND_TAGLINE = 'Strength Behind Every Structure';

/** Primary headings (cover, major sections) — matches model apps + login (Roboto Serif) */
export const REPORT_FONT_DISPLAY = '"Roboto Serif", Georgia, "Noto Serif", ui-serif, serif';
/** Body — Inter stack aligned with Capital Bridge web apps */
export const REPORT_FONT_BODY = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

export const REPORT_TYPE = {
  coverTitle: { fontSize: '28pt', fontWeight: 700 as const },
  coverSubtitle: { fontSize: '14pt', fontWeight: 400 as const },
  /** Major sections — brand green for print clarity */
  sectionH2: { fontSize: '18pt', fontWeight: 700 as const },
  sectionH2Small: { fontSize: '14pt', fontWeight: 700 as const },
  sectionH3: { fontSize: '11pt', fontWeight: 700 as const },
  body: { fontSize: '10pt', lineHeight: 1.5 as const },
  bodyLarge: { fontSize: '11pt', lineHeight: 1.5 as const },
  label: { fontSize: '9pt', fontWeight: 700 as const },
  kpiValue: { fontSize: '14pt', fontWeight: 700 as const },
} as const;
