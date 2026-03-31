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
      className={`w-full shrink-0 border-0 border-t border-solid border-[rgba(255,204,106,0.28)] bg-[#0d3a1d] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 opacity-100 sm:px-4 sm:pb-4 sm:pt-4 ${className}`.trim()}
    >
      <p
        className="mx-auto max-w-5xl text-center font-sans !text-[#F6F5F1]/88 leading-snug antialiased sm:leading-relaxed"
        style={{ fontSize: "max(11px, 0.7rem)" }}
      >
        {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
      </p>
    </footer>
  );
}
