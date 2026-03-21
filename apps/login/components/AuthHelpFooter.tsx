/**
 * Shared help line for all login-app surfaces — thin gold rule + consistent typography.
 */
export function AuthHelpFooter() {
  return (
    <footer
      className="mt-auto w-full shrink-0 border-t border-cb-gold/40 bg-[#0d3a1d] px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6"
      aria-label="Help"
    >
      <p className="mx-auto max-w-lg text-center font-sans text-[13px] font-normal leading-relaxed tracking-[0.02em] text-cb-gold/90 antialiased sm:text-sm">
        Need Help? Email{" "}
        <a
          href="mailto:admin@thecapitalbridge.com"
          className="font-medium text-cb-gold underline decoration-cb-gold/50 underline-offset-[3px] transition hover:text-cb-gold hover:decoration-cb-gold"
        >
          admin@thecapitalbridge.com
        </a>
      </p>
    </footer>
  );
}
