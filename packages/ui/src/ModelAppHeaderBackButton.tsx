/**
 * Full navigation to the advisory platform (not client-side routing).
 * Using a real link avoids any ambiguity with auth flows and supports open-in-new-tab.
 * Styling: `.pf-chrome-gold-btn` from `@cb/ui/cb-model-base.css` (platform LOGOUT parity).
 */
export function ModelAppHeaderBackButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="pf-chrome-gold-btn pf-chrome-gold-btn--header-inline shrink-0"
      aria-label="Back to Capital Bridge platform"
    >
      BACK
    </a>
  );
}
