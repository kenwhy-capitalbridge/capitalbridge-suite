import type { CSSProperties } from "react";

const GOLD = "#FFCC6A";
const CREAM = "#F6F5F1";
const GREEN = "#0D3A1D";

export type CapitalBridgeLogoTextProps = {
  className?: string;
  /** `badge`: green panel (default). `transparent`: text only for dark headers. */
  variant?: "badge" | "transparent";
};

/**
 * Text-based wordmark: Roboto Serif via parent `--cb-font-serif` / Tailwind `font-serif`.
 * For raster/vector files used in headers, see `brandPaths.ts` and `public/brand/` (sync script).
 */
export function CapitalBridgeLogoText({ className = "", variant = "badge" }: CapitalBridgeLogoTextProps) {
  const shellStyle: CSSProperties =
    variant === "badge"
      ? {
          backgroundColor: GREEN,
          borderRadius: 10,
          padding: "0.65rem 1rem 0.75rem",
        }
      : {};

  return (
    <div
      className={`inline-block max-w-full text-center ${className}`.trim()}
      style={shellStyle}
      role="img"
      aria-label="Capital Bridge — Strength Behind Every Structure"
    >
      <p
        className="m-0 font-serif text-[clamp(0.95rem,2.5vw,1.35rem)] font-bold uppercase leading-tight tracking-[0.12em]"
        style={{ color: GOLD }}
      >
        Capital Bridge
      </p>
      <p
        className="m-0 mt-1 font-serif text-[clamp(0.62rem,1.6vw,0.8125rem)] font-normal leading-snug tracking-[0.08em]"
        style={{ color: CREAM }}
      >
        Strength Behind Every Structure
      </p>
    </div>
  );
}
