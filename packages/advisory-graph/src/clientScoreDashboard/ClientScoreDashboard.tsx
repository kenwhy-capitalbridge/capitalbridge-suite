import type { LionScoreTier } from '../lionsVerdict/types';
import { REPORT_BRAND_GREEN } from '../reports/tokens';
import { getClientScoreDashboardTagline } from './taglines';
import { ScoreGauge } from './ScoreGauge';

export type ClientMetricCard = {
  label: string;
  value: string;
  sub?: string;
};

export type ClientScoreDashboardProps = {
  /** 0–100 structural / client score */
  score0to100: number;
  /** Drives mandatory tagline under the score (Strong | Very Strong vs other tiers). */
  lionStatus: LionScoreTier;
  /** Line under the main score number, e.g. tier name */
  statusLabel?: string;
  /** Exactly three KPI-style tiles */
  metrics: readonly [ClientMetricCard, ClientMetricCard, ClientMetricCard];
  progressToGoal: {
    heading: string;
    /** 0–100 */
    percent: number;
    footnote?: string;
  };
  /** Model-specific insight (separate from the mandatory tagline). */
  insightLine: string;
  cta: { label: string } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });
  className?: string;
};

const TEXT = '#0D3A1D';
const ACCENT = '#FFCC6A';
const SCORE_COLOR = REPORT_BRAND_GREEN;
const CARD_BG = 'rgba(255, 204, 106, 0.1)';
const BORDER = 'rgba(198, 162, 77, 0.35)';

/**
 * Client score dashboard: score + mandatory tagline, gauge, three metric cards,
 * progress-to-goal bar, insight, and CTA.
 */
export function ClientScoreDashboard({
  score0to100,
  lionStatus,
  statusLabel,
  metrics,
  progressToGoal,
  insightLine,
  cta,
  className = '',
}: ClientScoreDashboardProps) {
  const tagline = getClientScoreDashboardTagline(lionStatus);
  const pct = Math.min(100, Math.max(0, progressToGoal.percent));

  const ctaInner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        padding: '0.65rem 1.25rem',
        borderRadius: 8,
        backgroundColor: ACCENT,
        color: TEXT,
        fontWeight: 700,
        fontSize: '0.875rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        fontFamily: 'inherit',
      }}
    >
      {cta.label}
    </span>
  );

  return (
    <section
      className={className}
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '1.25rem 1rem 1.5rem',
        color: TEXT,
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <div
          style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: SCORE_COLOR,
          }}
          aria-live="polite"
        >
          {Math.round(score0to100)}
        </div>
        {statusLabel ? (
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginTop: 4, opacity: 0.85 }}>
            {statusLabel}
          </div>
        ) : null}
        <p
          style={{
            margin: '0.75rem auto 0',
            maxWidth: 420,
            fontSize: '0.95rem',
            fontStyle: 'italic',
            lineHeight: 1.45,
            color: 'rgba(13, 58, 29, 0.92)',
          }}
        >
          {tagline}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <ScoreGauge value0to100={score0to100} tier={lionStatus} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          marginBottom: '1.25rem',
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={`${m.label}-${i}`}
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              backgroundColor: CARD_BG,
              padding: '0.65rem 0.5rem',
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: ACCENT,
                marginBottom: 6,
                lineHeight: 1.2,
              }}
            >
              {m.label}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
              {m.value}
            </div>
            {m.sub ? (
              <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4, lineHeight: 1.25 }}>{m.sub}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1.1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <span>{progressToGoal.heading}</span>
          <span style={{ color: ACCENT }}>{Math.round(pct)}%</span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: 'rgba(13, 58, 29, 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${ACCENT}, #FFE9B0)`,
              transition: 'width 0.35s ease',
            }}
          />
        </div>
        {progressToGoal.footnote ? (
          <p style={{ margin: '6px 0 0', fontSize: '0.72rem', opacity: 0.8, lineHeight: 1.35 }}>
            {progressToGoal.footnote}
          </p>
        ) : null}
      </div>

      <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', lineHeight: 1.5, textAlign: 'center' }}>{insightLine}</p>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {cta.href ? (
          <a href={cta.href} style={{ textDecoration: 'none' }}>
            {ctaInner}
          </a>
        ) : (
          <button type="button" onClick={cta.onClick} style={{ background: 'none', padding: 0, border: 'none' }}>
            {ctaInner}
          </button>
        )}
      </div>
    </section>
  );
}
