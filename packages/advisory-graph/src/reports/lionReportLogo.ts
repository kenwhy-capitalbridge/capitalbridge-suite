import lionLogo from './assets/capital-bridge-lion-logo.png';

/**
 * Bundled Capital Bridge lion logo (official report / Lion’s Verdict asset).
 * Next.js may provide `StaticImageData`; plain bundlers may provide a string URL.
 */
export function getCapitalBridgeReportLogoSrc(): string {
  const m = lionLogo as string | { src: string };
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object' && 'src' in m) return m.src;
  return '';
}
