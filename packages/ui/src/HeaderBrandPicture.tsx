import {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_LARGE_FULL_CAPITAL_BRIDGE_GOLD,
  BRAND_LIONHEAD_GOLD,
} from "./brandPaths";

export type HeaderBrandPictureProps = {
  pictureClassName?: string;
  imgClassName?: string;
};

/**
 * One `<picture>`; first matching `<source>` wins.
 *
 * **Desktop (≥768px):** Large-Full (1280+) → wordmark (1024–1279) → lion (768–1023) → …
 * **Mobile (<768px):** wordmark (400–767) → lion.
 */
export function HeaderBrandPicture({
  pictureClassName = "",
  imgClassName = "cb-header-chrome-picture-img",
}: HeaderBrandPictureProps) {
  return (
    <picture className={`cb-header-chrome-picture ${pictureClassName}`.trim()}>
      <source media="(min-width: 1280px)" srcSet={BRAND_LARGE_FULL_CAPITAL_BRIDGE_GOLD} />
      <source
        media="(min-width: 1024px) and (max-width: 1279px)"
        srcSet={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
      />
      <source
        media="(min-width: 768px) and (max-width: 1023px)"
        srcSet={BRAND_LIONHEAD_GOLD}
      />
      <source
        media="(min-width: 400px) and (max-width: 767px)"
        srcSet={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
      />
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
