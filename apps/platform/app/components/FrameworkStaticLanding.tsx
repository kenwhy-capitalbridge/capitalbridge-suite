import { PlatformFrameworkHeader } from "./PlatformFrameworkHeader";
import { FrameworkLaunchRow } from "./FrameworkLaunchRow";

const FOREVER_APP_URL =
  typeof process.env.NEXT_PUBLIC_FOREVER_APP_URL === "string" && process.env.NEXT_PUBLIC_FOREVER_APP_URL
    ? process.env.NEXT_PUBLIC_FOREVER_APP_URL.replace(/\/+$/, "")
    : "https://forever.thecapitalbridge.com";

export type FrameworkStaticLandingProps = {
  /** Passed through so the sticky header always renders when this page already proved auth. */
  userEmail?: string | null;
};

/** Advisory framework marketing layout (ported from legacy platform; no public “request access” footer). */
export async function FrameworkStaticLanding({ userEmail }: FrameworkStaticLandingProps = {}) {
  const arrow = (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 10l5 5 5-5z" fill="currentColor" />
    </svg>
  );
  return (
    <>
      <PlatformFrameworkHeader verifiedUserEmail={userEmail ?? null} publicBrowse={!userEmail} />
      <main className="cb-framework">
        <header className="cb-hero">
          <div className="cb-hero-inner">
            <p className="cb-platform-label">Capital Bridge Advisory Platform</p>
            <h1>Capital Bridge Advisory Framework</h1>
            <p className="cb-hero-desc">
              Institutional-grade capital modelling for income sustainability, risk resilience, and long-term financial
              structure.
            </p>
            <p className="cb-hero-descriptor">Decision Modelling System for Capital Sustainability</p>
          </div>
        </header>

        <section className="cb-section">
          <div className="cb-section-inner">
          <h2 className="cb-section-title">How the Capital Bridge Advisory Framework Works</h2>
          <p className="cb-section-subtitle">
            Each model evaluates a critical dimension of capital sustainability, enabling structured capital
            decision-making.
          </p>

          <div className="cb-flow-wrap">
            <div className="cb-flow-grid">
              <div className="cb-flow-cell">
                <span className="cb-flow-a">Evaluate</span>
                <span className="cb-flow-b">Sustainability</span>
              </div>
              <div className="cb-flow-cell">
                <span className="cb-flow-a">Engineer</span>
                <span className="cb-flow-b">Capital</span>
              </div>
              <div className="cb-flow-cell">
                <span className="cb-flow-a">Stress Test</span>
                <span className="cb-flow-b">Resilience</span>
              </div>
            </div>
            <div className="cb-flow-connector-row" aria-hidden="true">
              <span className="cb-flow-connector-seg" />
              <span className="cb-flow-connector-seg" />
              <span className="cb-flow-connector-seg" />
            </div>
            <div className="cb-flow-indicators" aria-hidden="true">
              <span className="cb-flow-indicator">{arrow}</span>
              <span className="cb-flow-indicator">{arrow}</span>
              <span className="cb-flow-indicator">{arrow}</span>
            </div>
          </div>

          <div className="cb-system-header">
            <p className="cb-system-header-label">System Status</p>
            <p className="cb-system-header-desc">
              Capital Decision System Active • 3 Analytical Engines Online • Strategic execution (roadmap)
            </p>
          </div>

          <div className="cb-modules-wrap">
            <div className="cb-modules">
              <article className="cb-module">
                <div className="cb-module-header-bar" />
                <div className="cb-module-body">
                  <span className="cb-module-meta">
                    <span className="cb-status-dot" aria-hidden="true" />
                    STATUS: AVAILABLE • MODULE 1
                  </span>
                  <span className="cb-module-engine-label">Decision Engine</span>
                  <h2>Income Durability</h2>
                  <p className="cb-module-why">
                    Evaluates whether your income structure can remain sustainable indefinitely without eroding capital.
                  </p>
                  <hr className="cb-module-divider" />
                  <p className="cb-module-desc">Evaluate whether income structures are sustainably funded indefinitely.</p>
                  <span className="cb-module-label">Launch Models:</span>
                  <FrameworkLaunchRow
                    buttons={[
                      { href: `${FOREVER_APP_URL}/`, label: "Forever Income Model" },
                      { href: "https://incomeengineering.thecapitalbridge.com/", label: "Income Engineering Model" },
                    ]}
                  />
                </div>
              </article>
              <article className="cb-module">
                <div className="cb-module-header-bar" />
                <div className="cb-module-body">
                  <span className="cb-module-meta">
                    <span className="cb-status-dot" aria-hidden="true" />
                    STATUS: AVAILABLE • MODULE 2
                  </span>
                  <span className="cb-module-engine-label">Decision Engine</span>
                  <h2>Capital Structure</h2>
                  <p className="cb-module-why">
                    Analyzes how capital sources, withdrawals, and investment growth interact to support long-term income.
                  </p>
                  <hr className="cb-module-divider" />
                  <p className="cb-module-desc">
                    Assess the strength of the capital funding and withdrawal structure.
                  </p>
                  <span className="cb-module-label">Launch Models:</span>
                  <FrameworkLaunchRow
                    buttons={[{ href: "https://capitalhealth.thecapitalbridge.com/", label: "Capital Health Model" }]}
                  />
                </div>
              </article>
              <article className="cb-module">
                <div className="cb-module-header-bar" />
                <div className="cb-module-body">
                  <span className="cb-module-meta">
                    <span className="cb-status-dot" aria-hidden="true" />
                    STATUS: AVAILABLE • MODULE 3
                  </span>
                  <span className="cb-module-engine-label">Decision Engine</span>
                  <h2>Risk & Resilience</h2>
                  <p className="cb-module-why">
                    Tests how your capital structure behaves under market stress, volatility, or unexpected changes.
                  </p>
                  <hr className="cb-module-divider" />
                  <p className="cb-module-desc">
                    Stress test capital structures under uncertainty and market shocks.
                  </p>
                  <span className="cb-module-label">Launch Models:</span>
                  <FrameworkLaunchRow
                    buttons={[{ href: "https://capitalstress.thecapitalbridge.com/", label: "Capital Stress Model" }]}
                  />
                </div>
              </article>
              <article className="cb-module cb-module--strategic">
                <div className="cb-module-header-bar" />
                <div className="cb-module-body">
                  <span className="cb-module-meta">
                    <span className="cb-status-dot cb-status-dot--soon" aria-hidden="true" />
                    STATUS: COMING SOON • MODULE 4
                  </span>
                  <span className="cb-module-engine-label">Advisory Layer</span>
                  <h2>Strategic Execution</h2>
                  <p className="cb-module-why">
                    Move beyond analysis into structured execution with Capital Bridge™ and licensed partners.
                  </p>
                  <hr className="cb-module-divider" />
                  <p className="cb-module-desc">Early access when structured execution goes live.</p>
                  <span className="cb-module-label">Next step:</span>
                  <FrameworkLaunchRow buttons={[{ href: "/solutions", label: "Request Priority Access" }]} />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
