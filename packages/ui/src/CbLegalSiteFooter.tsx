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
      className={`w-full shrink-0 border-0 bg-[#0d3a1d] px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-10 sm:pb-4 sm:pt-4 md:px-16 lg:px-24 ${className}`.trim()}
    >
      <div className="cb-legal-footer-top-rule" aria-hidden />
      <p
        className="cb-legal-footer-copy antialiased"
      >
        {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
      </p>
    </footer>
  );
}
