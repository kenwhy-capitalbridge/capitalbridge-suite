import { BRAND_CAPITAL_BRIDGE_LOGO_GOLD, BRAND_LIONHEAD_GOLD } from "./brandPaths";

export type HeaderBrandPictureProps = {
  pictureClassName?: string;
  imgClassName?: string;
};

/**
 * Single `<picture>` so one asset always renders — avoids fragile stacks of `display:none` imgs
 * and container-query ordering bugs across browsers.
 */
export function HeaderBrandPicture({
  pictureClassName = "",
  imgClassName = "cb-header-chrome-picture-img",
}: HeaderBrandPictureProps) {
  return (
    <picture className={`cb-header-chrome-picture ${pictureClassName}`.trim()}>
      {/* Wide desktop: same lockup as tablet — avoids 404 on optional BiggerFont asset missing from some app `public/brand/`. */}
      <source media="(min-width: 1440px)" srcSet={BRAND_CAPITAL_BRIDGE_LOGO_GOLD} />
      <source media="(min-width: 1024px)" srcSet={BRAND_CAPITAL_BRIDGE_LOGO_GOLD} />
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt="Capital Bridge"
        width={210}
        height={36}
        decoding="async"
        fetchPriority="high"
        className={imgClassName}
      />
    </picture>
  );
}
