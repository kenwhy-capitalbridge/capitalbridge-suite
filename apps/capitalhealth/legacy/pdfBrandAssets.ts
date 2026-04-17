/**
 * Bundled PNG paths for Capital Health PDF export.
 * Import from `packages/ui` so Next emits stable `/_next/static/media/...` URLs
 * (fetching `/brand/*.png` from `public/` can fail depending on deploy/CDN routing).
 */
import footerLogoPng from '../../../packages/ui/src/assets/CapitalBridgeLogo_Green.png';
import fullLockupPng from '../../../packages/ui/src/assets/Full_CapitalBridge_Green.png';

type NextStaticImage = string | { src: string };

function nextImageSrc(m: NextStaticImage): string {
  return typeof m === 'string' ? m : m.src;
}

export const CAPITAL_HEALTH_PDF_BRAND = {
  fullLockupSrc: nextImageSrc(fullLockupPng),
  footerLogoSrc: nextImageSrc(footerLogoPng),
} as const;
