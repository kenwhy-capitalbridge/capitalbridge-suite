import { BRAND_LARGE_FULL_CAPITAL_BRIDGE_GOLD, BRAND_LIONHEAD_GOLD } from "./brandPaths";

export type HeaderBrandPictureProps = {
  pictureClassName?: string;
  imgClassName?: string;
};

/**
 * One `<picture>`; first matching `<source>` wins.
 *
 * **Wide desktop (≥1280px):** full gold lockup (`Large-Full_CapitalBridge_Gold.svg`).
 * **Below that (narrow desktop, tablet, mobile):** lion head only — no standalone
 * `CapitalBridgeLogo_Gold.svg` wordmark so the header stays compact when width is tight.
 */
export function HeaderBrandPicture({
  pictureClassName = "",
  imgClassName = "cb-header-chrome-picture-img",
}: HeaderBrandPictureProps) {
  return (
    <picture className={`cb-header-chrome-picture ${pictureClassName}`.trim()}>
      <source media="(min-width: 1280px)" srcSet={BRAND_LARGE_FULL_CAPITAL_BRIDGE_GOLD} />
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
