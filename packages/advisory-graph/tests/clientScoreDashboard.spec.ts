import { describe, expect, it } from 'vitest';
import {
  CLIENT_SCORE_TAGLINE_NON_STRONG,
  CLIENT_SCORE_TAGLINE_STRONG,
  getClientScoreDashboardTagline,
  getClientScoreDashboardTaglineFromHealthTier,
  getClientScoreDashboardTaglineFromPublicStatus,
} from '../src/clientScoreDashboard/taglines';

describe('clientScoreDashboard taglines', () => {
  it('uses non-strong line for Critical, Weak, Moderate', () => {
    expect(getClientScoreDashboardTagline('Critical')).toBe(CLIENT_SCORE_TAGLINE_NON_STRONG);
    expect(getClientScoreDashboardTagline('Weak')).toBe(CLIENT_SCORE_TAGLINE_NON_STRONG);
    expect(getClientScoreDashboardTagline('Moderate')).toBe(CLIENT_SCORE_TAGLINE_NON_STRONG);
  });

  it('uses strong line for Strong and Very Strong', () => {
    expect(getClientScoreDashboardTagline('Strong')).toBe(CLIENT_SCORE_TAGLINE_STRONG);
    expect(getClientScoreDashboardTagline('Very Strong')).toBe(CLIENT_SCORE_TAGLINE_STRONG);
  });

  it('maps health tiers 1–2 to strong copy', () => {
    expect(getClientScoreDashboardTaglineFromHealthTier(1)).toBe(CLIENT_SCORE_TAGLINE_STRONG);
    expect(getClientScoreDashboardTaglineFromHealthTier(2)).toBe(CLIENT_SCORE_TAGLINE_STRONG);
    expect(getClientScoreDashboardTaglineFromHealthTier(3)).toBe(CLIENT_SCORE_TAGLINE_NON_STRONG);
  });

  it('maps public Lion status STRONG to strong copy', () => {
    expect(getClientScoreDashboardTaglineFromPublicStatus('STRONG')).toBe(CLIENT_SCORE_TAGLINE_STRONG);
    expect(getClientScoreDashboardTaglineFromPublicStatus('STABLE')).toBe(CLIENT_SCORE_TAGLINE_NON_STRONG);
  });
});
