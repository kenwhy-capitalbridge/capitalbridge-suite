import type { CalculatorInputs } from '../../calculator-types';
import type { CalculatorResults } from '../hooks/useCalculatorResults';
import { generateReportBlob } from '../../CapitalGrowthReport';
import { CAPITAL_HEALTH_PDF_BRAND } from '../../pdfBrandAssets';
import type { ReportChartPoint } from '../../ReportPrint';
import { createReportAuditMeta } from '@cb/shared/reportTraceability';

const CAPITAL_HEALTH_COVER_LOGO_PNG_PATH = '/brand/Full_CapitalBridge_Green.png';
const CAPITAL_HEALTH_FOOTER_LOGO_PNG_PATH = '/brand/CapitalBridgeLogo_Green.png';

function absoluteUrlForNextAsset(assetPath: string): string {
  if (typeof window === 'undefined') return '';
  if (assetPath.startsWith('http')) return assetPath;
  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${window.location.origin}${path}`;
}

/** Fetch any same-origin URL and return a data URL for @react-pdf/renderer Image. */
async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Fallback: read PNG from `/public/brand/` when bundled-asset fetch fails. */
async function loadCoverLogoPngForPdf(pageOrigin: string): Promise<string | null> {
  return fetchUrlAsDataUrl(`${pageOrigin}${CAPITAL_HEALTH_COVER_LOGO_PNG_PATH}`);
}

/** Fallback: footer PNG from `/public/brand/`. */
async function loadFooterLogoPngForPdf(pageOrigin: string): Promise<string | null> {
  return fetchUrlAsDataUrl(`${pageOrigin}${CAPITAL_HEALTH_FOOTER_LOGO_PNG_PATH}`);
}

export async function exportCapitalHealthReport(args: {
  inputs: CalculatorInputs;
  result: CalculatorResults;
  chartPoints: ReportChartPoint[];
  currentAge?: number | null;
  /** Paid / entitled users only; trial exports omit Lion's Verdict in the PDF. */
  includeLionsVerdict?: boolean;
  reportClientDisplayName?: string;
}): Promise<void> {
  const audit = createReportAuditMeta({
    modelCode: 'HEALTH',
    userDisplayName: args.reportClientDisplayName ?? 'Client',
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bundledCoverAbs = origin ? absoluteUrlForNextAsset(CAPITAL_HEALTH_PDF_BRAND.fullLockupSrc) : '';
  const bundledFooterAbs = origin ? absoluteUrlForNextAsset(CAPITAL_HEALTH_PDF_BRAND.footerLogoSrc) : '';

  const coverFromBundle = bundledCoverAbs ? await fetchUrlAsDataUrl(bundledCoverAbs) : null;
  const footerFromBundle = bundledFooterAbs ? await fetchUrlAsDataUrl(bundledFooterAbs) : null;

  const brandFullLockupPngDataUrl =
    coverFromBundle ?? (origin ? await loadCoverLogoPngForPdf(origin) : null);
  const brandWordmarkPngDataUrl =
    footerFromBundle ?? (origin ? await loadFooterLogoPngForPdf(origin) : null);

  const blob = await generateReportBlob(args.inputs, args.result, {
    chartData: args.chartPoints,
    currentAge: args.currentAge ?? undefined,
    includeLionsVerdict: args.includeLionsVerdict ?? true,
    reportClientDisplayName: args.reportClientDisplayName,
    reportAudit: audit,
    brandFullLockupPngDataUrl: brandFullLockupPngDataUrl ?? undefined,
    brandWordmarkPngDataUrl: brandWordmarkPngDataUrl ?? undefined,
    brandFullLockupSrc: brandFullLockupPngDataUrl ? undefined : bundledCoverAbs || undefined,
    brandWordmarkSrc: brandWordmarkPngDataUrl ? undefined : bundledFooterAbs || undefined,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = audit.filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
