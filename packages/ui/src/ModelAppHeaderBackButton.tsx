import styles from "./ModelAppHeader.module.css";

/**
 * Full navigation to the advisory platform (not client-side routing).
 * Using a real link avoids any ambiguity with auth flows and supports open-in-new-tab.
 */
export function ModelAppHeaderBackButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className={styles.back}
      aria-label="Back to Capital Bridge platform"
    >
      BACK
    </a>
  );
}
