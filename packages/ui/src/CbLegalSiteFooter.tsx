import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY } from "@cb/shared/legalMonocopy";

export type CbLegalSiteFooterProps = {
  id?: string;
  className?: string;
};

/**
 * Global legal monocopy — smallest legible size (~11px floor) for long-form IP notice.
 */
export function CbLegalSiteFooter({ id, className = "" }: CbLegalSiteFooterProps) {
  return (
    <footer
      id={id}
      role="contentinfo"
      aria-label="Copyright and legal"
      className={`cb-legal-site-footer ${className}`.trim()}
    >
      <div className="cb-legal-site-footer-inner">
        <div className="cb-legal-footer-top-rule" aria-hidden />
        <p className="cb-legal-site-footer-copy">{CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}</p>
      </div>
    </footer>
  );
}
