import type { ReactNode } from "react";
import { MARKETING_SITE_URL, PLATFORM_APP_URL } from "@cb/shared/urls";
import { ModelAppHeaderBackButton } from "./ModelAppHeaderBackButton";
import { BRAND_CAPITAL_BRIDGE_LOGO_GOLD } from "./brandPaths";
import styles from "./ModelAppHeader.module.css";

function marketingHomeUrl(): string {
  const base = MARKETING_SITE_URL.replace(/\/+$/, "");
  return `${base}/`;
}

function platformHomeUrl(): string {
  const base = PLATFORM_APP_URL.replace(/\/+$/, "");
  return `${base}/`;
}

export type ModelAppHeaderProps = {
  /** Large screens: full product line (e.g. INCOME ENGINEERING MODEL). */
  titleDesktop: string;
  /** Small screens: shorter label so one row fits (e.g. INCOME ENGINEERING). Omit to reuse desktop + smaller font only. */
  titleMobile?: string;
  /** Defaults to platform origin + `/`. */
  backHref?: string;
  /** Optional right-side controls (e.g. Save / load snapshots), shown next to Back. */
  actions?: ReactNode;
};

/**
 * Fixed top bar aligned with platform Framework: logo → marketing | title | Back → platform.
 * Uses fixed positioning (not sticky) so it stays visible when legacy calculator CSS sets
 * `overflow-x: hidden` on html/body, which breaks `position: sticky`.
 */
export function ModelAppHeader({ titleDesktop, titleMobile, backHref, actions }: ModelAppHeaderProps) {
  const home = marketingHomeUrl();
  const back = backHref ?? platformHomeUrl();
  const short = titleMobile?.trim();

  return (
    <>
      <header
        className={styles.fixed}
        style={{
          /* Inline so positioning survives CSS ordering issues; module still supplies theme. */
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          width: "100%",
        }}
      >
        <div className={styles.wrap}>
          <a
            href={home}
            style={{
              justifySelf: "start",
              display: "flex",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <img
              src={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
              alt="Capital Bridge — Strength Behind Every Structure"
              width={200}
              height={40}
              decoding="async"
              fetchPriority="high"
              style={{
                height: "clamp(14px, 3.8vw, 24px)",
                width: "auto",
                maxWidth: "min(28vw, 128px)",
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          </a>

          <div
            style={{
              justifySelf: "center",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minWidth: 0,
              width: "100%",
              paddingInline: "0.15rem",
            }}
          >
            {short && short !== titleDesktop ? (
              <>
                <span className={`${styles.titleBase} ${styles.titleFull}`}>{titleDesktop}</span>
                <span className={`${styles.titleBase} ${styles.titleCompact}`}>{short}</span>
              </>
            ) : (
              <span className={`${styles.titleBase} ${styles.titleSingle}`}>{titleDesktop}</span>
            )}
          </div>

          <div className={styles.actionsCluster}>
            <ModelAppHeaderBackButton href={back} />
            {actions}
          </div>
        </div>
      </header>
      <div className={styles.spacer} aria-hidden />
    </>
  );
}
