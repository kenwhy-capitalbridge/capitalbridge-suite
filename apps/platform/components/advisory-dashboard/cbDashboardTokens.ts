/** Capital Bridge advisory dashboard — approved direction tokens (no Figma file). */
export const CB = {
  green: "#0D3A1D",
  white: "#F6F5F1",
  gold: "#FFCC6A",
  black: "#2B2B2B",
  /** Flat cards / KPI */
  cardBg: "rgba(13, 58, 29, 0.78)",
  cardBorder: "1px solid rgba(255, 204, 106, 0.5)",
  /** Primary panels — institutional gradient */
  panelSurface:
    "linear-gradient(180deg, rgba(13, 58, 29, 0.96) 0%, rgba(7, 38, 20, 0.94) 100%)",
  panelBorder: "1px solid rgba(255, 204, 106, 0.42)",
  radiusLg: 17,
  radiusMd: 16,
  shadowCard:
    "0 12px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 204, 106, 0.07), inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
  /** Chart well — deeper inset */
  chartWellShadow:
    "inset 0 2px 12px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 204, 106, 0.15), 0 1px 0 rgba(255, 204, 106, 0.06)",
  success: "#6ee7a0",
} as const;

export const fontSerif = 'var(--font-cb-advisory-serif), "Roboto Serif", Georgia, serif';
export const fontSans = 'var(--font-cb-advisory-sans), Inter, system-ui, sans-serif';
