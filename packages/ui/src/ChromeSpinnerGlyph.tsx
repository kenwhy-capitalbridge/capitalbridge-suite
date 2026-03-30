export type ChromeSpinnerGlyphProps = {
  className?: string;
  /** Box size in px — always set inline so spinners stay sized when Tailwind omits `@cb/ui` / `@cb/advisory-graph` from `content`. Default 14. */
  sizePx?: number;
};

/**
 * Inline spinner: rotation uses CSS keyframes on an inner wrapper (`cb-spinner-glyph-spin`) so it
 * animates reliably in WebKit; SMIL on SVG was static in some builds. Size is inline so it never
 * depends on Tailwind.
 */
export function ChromeSpinnerGlyph({ className = "", sizePx = 14 }: ChromeSpinnerGlyphProps) {
  return (
    <span
      className={["cb-spinner-glyph", className.trim()].filter(Boolean).join(" ")}
      style={{
        width: sizePx,
        height: sizePx,
        minWidth: sizePx,
        minHeight: sizePx,
        maxWidth: sizePx,
        maxHeight: sizePx,
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 0,
        verticalAlign: "middle",
        color: "inherit",
        overflow: "visible",
      }}
      aria-hidden
    >
      <span
        className="cb-spinner-glyph-spin"
        style={{
          width: sizePx,
          height: sizePx,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          focusable="false"
          style={{ display: "block", flexShrink: 0 }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={4}
            fill="none"
            opacity={0.25}
          />
          <path
            fill="currentColor"
            opacity={0.75}
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </span>
    </span>
  );
}
