export type { ClientMetricCard, ClientScoreDashboardProps } from './ClientScoreDashboard';
export { ClientScoreDashboard } from './ClientScoreDashboard';
export type { ScoreGaugeProps } from './ScoreGauge';
export { ScoreGauge } from './ScoreGauge';
export {
  CLIENT_SCORE_TAGLINE_NON_STRONG,
  CLIENT_SCORE_TAGLINE_STRONG,
  clientScoreStrongFromHealthRiskTier,
  getClientScoreDashboardTagline,
  getClientScoreDashboardTaglineFromHealthTier,
  getClientScoreDashboardTaglineFromPublicStatus,
  isClientScoreStrongStatus,
} from './taglines';
