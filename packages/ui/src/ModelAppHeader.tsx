"use client";

import type { ReactNode } from "react";
import { MARKETING_SITE_URL, platformBackThroughSessionSyncUrl } from "@cb/shared/urls";
import { ChromePendingNavLink } from "./ChromePendingNavLink";
import { ModelAppHeaderBackButton } from "./ModelAppHeaderBackButton";
import {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_FULL_CAPITAL_BRIDGE_GOLD,
  BRAND_LIONHEAD_GOLD,
} from "./brandPaths";
import { useModelMetricSpine } from "./modelMetricSpineContext";
import styles from "./ModelAppHeader.module.css";

function marketingHomeUrl(): string {
  const base = MARKETING_SITE_URL.replace(/\/+$/, "");
  return `${base}/`;
}

function platformHomeUrl(): string {
  return platformBackThroughSessionSyncUrl("/");
}

export type ModelAppHeaderProps = {
  titleDesktop: string;
  titleMobile?: string;
  backHref?: string;
  actions?: ReactNode;
  /** Slightly smaller serif title next to logo (long labels like Income Engineering). */
  compactTitle?: boolean;
};

function MetricBlockDesktop({
  labelDesktop,
  value,
}: {
  labelDesktop: string;
  value: ReactNode;
}) {
  return (
    <div className={styles.metricBlockDesktop}>
      <div className={styles.metricLabelDesktop} title={labelDesktop}>
        {labelDesktop}
      </div>
      <div className={styles.metricValueDesktop}>{value}</div>
    </div>
  );
}

function MetricBlockMobile({
  labelMobile,
  value,
}: {
  labelMobile: string;
  value: ReactNode;
}) {
  return (
    <div className={styles.metricBlockMobile}>
      <div className={styles.metricLabelMobile} title={labelMobile}>
        {labelMobile}
      </div>
      <div className={styles.metricValueMobile}>{value}</div>
    </div>
  );
}

/**
 * Fixed top bar: logo, model title, optional 3-slot metric spine (when provider is active), Back + actions.
 */
export function ModelAppHeader({ titleDesktop, titleMobile, backHref, actions, compactTitle }: ModelAppHeaderProps) {
  const home = marketingHomeUrl();
  const back = backHref ?? platformHomeUrl();
  const short = titleMobile?.trim();
  const { spine } = useModelMetricSpine();
  const hasSpine = spine != null;

  return (
    <>
      <header
        className={`${styles.fixed} ${hasSpine ? styles.fixedWithSpine : ""} ${compactTitle ? styles.headerTitleCompact : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          width: "100%",
        }}
      >
        {hasSpine ? (
          <>
            <div className={styles.spineDesktop}>
              <div className={styles.spineDesktopLeft}>
                <a href={home} className={styles.logoLink} aria-label="Capital Bridge home">
                  <img
                    src={BRAND_FULL_CAPITAL_BRIDGE_GOLD}
                    alt=""
                    width={280}
                    height={48}
                    decoding="async"
                    fetchPriority="high"
                    className={styles.logoFullWide}
                  />
                  <img
                    src={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
                    alt=""
                    width={220}
                    height={44}
                    decoding="async"
                    className={styles.logoWordmarkTablet}
                  />
                  <img
                    src={BRAND_LIONHEAD_GOLD}
                    alt=""
                    width={48}
                    height={48}
                    decoding="async"
                    className={styles.logoLionTablet}
                  />
                </a>
                <div className={styles.titleCluster}>
                  {short && short !== titleDesktop ? (
                    <>
                      <span className={`${styles.titleBase} ${styles.titleDesk}`}>{titleDesktop}</span>
                      <span className={`${styles.titleBase} ${styles.titleDeskShort}`}>{short}</span>
                    </>
                  ) : (
                    <span className={`${styles.titleBase} ${styles.titleDesk}`}>{titleDesktop}</span>
                  )}
                </div>
              </div>
              <div className={styles.spineDesktopMetrics} role="group" aria-label="Key metrics">
                <MetricBlockDesktop labelDesktop={spine.slot1.labelDesktop} value={spine.slot1.value} />
                <MetricBlockDesktop labelDesktop={spine.slot2.labelDesktop} value={spine.slot2.value} />
                <MetricBlockDesktop labelDesktop={spine.slot3.labelDesktop} value={spine.slot3.value} />
              </div>
              <div className={styles.actionsCluster}>
                <ModelAppHeaderBackButton href={back} />
                {actions}
              </div>
            </div>

            <div className={styles.spineMobile}>
              <div className={styles.spineMobileTop}>
                <ChromePendingNavLink href={home} className={styles.spineMobileLionLink} ariaLabel="Capital Bridge home">
                  <img
                    src={BRAND_LIONHEAD_GOLD}
                    alt=""
                    width={32}
                    height={32}
                    decoding="async"
                    className={styles.spineMobileLion}
                  />
                </ChromePendingNavLink>
                <div className={styles.spineMobileBackSlot}>
                  <ModelAppHeaderBackButton href={back} />
                </div>
                <div className={styles.spineMobileTitleSlot}>
                  <span className={styles.titleMobileCentered}>{short ?? titleDesktop}</span>
                </div>
                <div className={styles.spineMobileActionsSlot}>{actions}</div>
              </div>
              <div className={styles.spineMobileGrid} role="group" aria-label="Key metrics">
                <MetricBlockMobile labelMobile={spine.slot1.labelMobile} value={spine.slot1.value} />
                <MetricBlockMobile labelMobile={spine.slot2.labelMobile} value={spine.slot2.value} />
                <MetricBlockMobile labelMobile={spine.slot3.labelMobile} value={spine.slot3.value} />
              </div>
            </div>
          </>
        ) : (
          <div className={styles.wrap}>
            <ChromePendingNavLink href={home} className={styles.logoLinkLegacy} ariaLabel="Capital Bridge home">
              <img
                src={BRAND_FULL_CAPITAL_BRIDGE_GOLD}
                alt=""
                width={280}
                height={48}
                decoding="async"
                fetchPriority="high"
                className={styles.legacyLogoFull}
              />
              <img
                src={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
                alt=""
                width={220}
                height={44}
                decoding="async"
                className={styles.legacyLogoWordmark}
              />
              <img
                src={BRAND_LIONHEAD_GOLD}
                alt=""
                width={48}
                height={48}
                decoding="async"
                className={styles.legacyLogoLion}
              />
            </ChromePendingNavLink>
            <div className={styles.titleCenter}>
              <span className={`${styles.titleBase} ${styles.titleLegacyDesk}`}>{titleDesktop}</span>
              <span className={`${styles.titleBase} ${styles.titleLegacyMobile}`}>{short ?? titleDesktop}</span>
            </div>
            <div className={styles.legacyRightGroup}>
              <span className={styles.legacyBackSlot}>
                <ModelAppHeaderBackButton href={back} />
              </span>
              <div className={styles.legacyActionsSlot}>{actions}</div>
            </div>
          </div>
        )}
      </header>
      <div
        className={`${styles.spacer} ${hasSpine ? styles.spacerWithSpine : ""}`}
        aria-hidden
      />
    </>
  );
}
