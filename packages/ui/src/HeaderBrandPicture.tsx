import {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_FULL_CAPITAL_BRIDGE_GOLD,
  BRAND_LIONHEAD_GOLD,
} from "./brandPaths";

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
      <source media="(min-width: 1024px)" srcSet={BRAND_FULL_CAPITAL_BRIDGE_GOLD} />
      <source media="(min-width: 400px)" srcSet={BRAND_CAPITAL_BRIDGE_LOGO_GOLD} />
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        width={280}
        height={48}
        decoding="async"
        fetchPriority="high"
        className={imgClassName}
      />
    </picture>
  );
}
