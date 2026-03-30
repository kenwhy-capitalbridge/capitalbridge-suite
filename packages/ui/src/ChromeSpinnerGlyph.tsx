export type ChromeSpinnerGlyphProps = {
  className?: string;
  /** Box size in px — always set inline so spinners stay sized when Tailwind omits `@cb/ui` / `@cb/advisory-graph` from `content`. Default 14. */
  sizePx?: number;
};

/**
 * Inline spinner: rotation uses SVG SMIL (`animateTransform`) so it still runs when parent
 * chrome uses CSS `transform` transitions (hover/active) — those can break `animation` on
 * descendants in WebKit. Size is inline so it never depends on Tailwind.
 */
export function ChromeSpinnerGlyph({ className = "", sizePx = 14 }: ChromeSpinnerGlyphProps) {
  return (
    <span
      className={className.trim()}
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
      }}
      aria-hidden
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        focusable="false"
      >
        <g style={{ transformOrigin: "12px 12px" }}>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.75s"
            repeatCount="indefinite"
          />
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
        </g>
      </svg>
    </span>
  );
}
