import { getCapitalBridgeReportLogoSrc } from './lionReportLogo';
import { REPORT_BRAND_TAGLINE } from './tokens';

export type ReportBrandMarkProps = {
  /** Max width of the logo image (height scales). */
  maxWidthPx?: number;
  /** Override bundled asset (e.g. app `public/` URL). */
  logoSrc?: string;
  className?: string;
};

/**
 * Official Capital Bridge lion logo for print/PDF and on-screen report shells.
 * Print-friendly: single colour on white, explicit dimensions, descriptive alt text.
 */
export function ReportBrandMark({ maxWidthPx = 320, logoSrc, className = '' }: ReportBrandMarkProps) {
  const src = logoSrc ?? getCapitalBridgeReportLogoSrc();
  if (!src) return null;

  return (
    <div
      className={`cb-report-brand-mark ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '1.75rem',
      }}
    >
      <img
        src={src}
        alt={`Capital Bridge — ${REPORT_BRAND_TAGLINE}`}
        style={{
          maxWidth: '100%',
          width: maxWidthPx,
          height: 'auto',
          objectFit: 'contain',
          objectPosition: 'center top',
        }}
      />
    </div>
  );
}
