import { BRAND_LIONHEAD_GOLD } from "./brandPaths";

export type BrandLionWatermarkProps = {
  className?: string;
  /** Extra classes on the `<img>` (default keeps Forever-style subtle stack). */
  imgClassName?: string;
};

/**
 * Low-opacity gold lion SVG for model dashboards. Parent must be `position: relative`
 * (and usually `overflow-hidden` if you want edges clipped). Asset path is per-app
 * `public/brand/lionhead_Gold.svg` (see `brandPaths.ts`).
 */
export function BrandLionWatermark({ className = "", imgClassName = "opacity-90" }: BrandLionWatermarkProps) {
  return (
    <div
      className={`no-print pointer-events-none absolute bottom-[-5%] right-[-10%] z-0 rotate-[-15deg] select-none opacity-[0.03] ${className}`}
      aria-hidden
    >
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        width={384}
        height={384}
        className={`h-auto w-96 max-w-[min(24rem,85vw)] ${imgClassName}`}
        draggable={false}
      />
    </div>
  );
}
