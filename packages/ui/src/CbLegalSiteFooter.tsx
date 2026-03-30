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
      className={`w-full shrink-0 border-t border-white/10 bg-[#0d3a1d] px-3 py-3 sm:px-4 sm:py-4 ${className}`.trim()}
    >
      <p
        className="mx-auto max-w-5xl text-center font-sans leading-snug text-[#F6F5F1]/80 antialiased sm:leading-relaxed"
        style={{ fontSize: "max(10px, 0.6875rem)" }}
      >
        {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
      </p>
    </footer>
  );
}
