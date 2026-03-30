import { getCapitalBridgeReportLionGreenSrc } from './lionReportLogo';
import { REPORT_BORDER, REPORT_BRAND_TAGLINE } from './tokens';

export type ReportInteriorHeaderProps = {
  logoSrc?: string;
  /** Logo height in px; width follows aspect ratio */
  logoHeightPx?: number;
  className?: string;
};

/**
 * Compact header for inner report pages (repeat after page breaks where needed).
 */
export function ReportInteriorHeader({ logoSrc, logoHeightPx = 40, className = '' }: ReportInteriorHeaderProps) {
  const src = logoSrc ?? getCapitalBridgeReportLionGreenSrc();
  if (!src) return null;

  return (
    <header
      className={`cb-report-interior-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: `1px solid ${REPORT_BORDER}`,
      }}
    >
      <img
        src={src}
        alt={`Capital Bridge — ${REPORT_BRAND_TAGLINE}`}
        height={logoHeightPx}
        style={{ height: logoHeightPx, width: 'auto', objectFit: 'contain' }}
      />
    </header>
  );
}
