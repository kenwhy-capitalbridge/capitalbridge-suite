export type ChromeSpinnerGlyphProps = {
  className?: string;
  /** Box size in px — always set inline so spinners stay sized when Tailwind omits `@cb/ui` / `@cb/advisory-graph` from `content`. Default 14. */
  sizePx?: number;
};

/** Inline spinner — rotation runs on the wrapper (see `cb-ui-icon-spin-wrap` in `cb-model-base.css`). */
export function ChromeSpinnerGlyph({ className = "", sizePx = 14 }: ChromeSpinnerGlyphProps) {
  return (
    <span
      className={`cb-ui-icon-spin-wrap ${className}`.trim()}
      style={{
        width: sizePx,
        height: sizePx,
        minWidth: sizePx,
        minHeight: sizePx,
        maxWidth: sizePx,
        maxHeight: sizePx,
        boxSizing: "border-box",
      }}
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
  );
}
