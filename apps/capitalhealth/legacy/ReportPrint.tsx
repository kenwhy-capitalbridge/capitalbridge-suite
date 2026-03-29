import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import type { CalculatorInputs } from './calculator-types';
import type { CalculatorResults } from './src/hooks/useCalculatorResults';
import { APP_NAME } from './src/lib/capitalHealthCopy';
import {
  buildLionVerdictClientReportFromCapitalHealth,
  formatLionPublicStatusLabel,
} from '@cb/advisory-graph/lionsVerdict';

export type ReportChartPoint = { month: number; nominal: number };

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatCurrency(symbol: string, n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}${symbol} ${formatNum(abs, 0)}`;
}

function tierToBadgeClass(tier: number): string {
  if (tier === 1) return 'very-strong';
  if (tier === 2) return 'strong';
  if (tier === 3) return 'moderate';
  if (tier === 4) return 'weak';
  return 'critical';
}

export function ReportPrint({
  inputs,
  result,
  chartPoints,
  dateLabel,
}: {
  inputs: CalculatorInputs;
  result: CalculatorResults;
  chartPoints: ReportChartPoint[];
  dateLabel: string;
}) {
  const symbol = inputs.currency.symbol;
  const tier = result.riskMetrics.riskTier;
  const tierLabel = result.riskMetrics.riskTierLabel;
  const badgeClass = tierToBadgeClass(tier);

  const horizonMonths = Math.round(inputs.timeHorizonYears * 12);
  const horizonYears = Math.floor(horizonMonths / 12);
  const horizonRemainderMonths = horizonMonths % 12;
  const horizonText = `${horizonYears}y ${horizonRemainderMonths}m`;

  const coveragePct =
    inputs.mode === 'withdrawal' ? result.coveragePct : result.compoundingProgressPct;

  const structureKpis = useMemo((): {
    label: string;
    value: string;
    sub: string;
    tone?: 'positive' | 'negative';
  }[] => {
    if (inputs.mode === 'withdrawal') {
      const target = inputs.targetMonthlyIncome;
      const projected = result.sustainableIncomeMonthly;
      const surplus = projected - target;
      return [
        { label: 'Target', value: formatCurrency(symbol, target), sub: 'Monthly income target' },
        { label: 'Expected return', value: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`, sub: 'Annual, nominal' },
        { label: 'Projected', value: formatCurrency(symbol, projected), sub: 'Sustainable monthly income (plan)' },
        { label: 'Surplus', value: formatCurrency(symbol, surplus), sub: 'Projected − target', tone: surplus >= 0 ? 'positive' : 'negative' },
      ];
    }

    const target = inputs.targetFutureCapital;
    const projected = result.nominalCapitalAtHorizon;
    const surplus = projected - target;
    return [
      { label: 'Target', value: formatCurrency(symbol, target), sub: 'Desired capital' },
      { label: 'Expected return', value: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`, sub: 'Annual, nominal' },
      { label: 'Projected', value: formatCurrency(symbol, projected), sub: `Capital at ${formatNum(inputs.timeHorizonYears, 1)} years` },
      { label: 'Surplus', value: formatCurrency(symbol, surplus), sub: 'Projected − target', tone: surplus >= 0 ? 'positive' : 'negative' },
    ];
  }, [inputs, result, symbol]);

  const lionClient = useMemo(() => {
    const mode = inputs.mode;
    const tier = Math.min(5, Math.max(1, result.riskMetrics.riskTier)) as 1 | 2 | 3 | 4 | 5;
    const runwayYears =
      inputs.mode === 'withdrawal' && result.depletionMonth != null
        ? (result.depletionMonth / 12).toFixed(1)
        : undefined;
    const vars = {
      withdrawal:
        inputs.mode === 'withdrawal'
          ? formatCurrency(symbol, inputs.targetMonthlyIncome)
          : undefined,
      desiredCapital:
        inputs.mode === 'growth'
          ? formatCurrency(symbol, inputs.targetFutureCapital)
          : undefined,
      horizon: `${Number(inputs.timeHorizonYears).toFixed(1)}`,
      runway: runwayYears,
      expectedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
      estimatedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
    };
    return buildLionVerdictClientReportFromCapitalHealth(
      {
        mode,
        tier,
        vars,
        startingCapital: inputs.startingCapital,
        targetMonthlyIncome: inputs.targetMonthlyIncome,
        targetFutureCapital: inputs.targetFutureCapital,
        passiveIncomeMonthly: result.passiveIncomeMonthly,
        nominalCapitalAtHorizon: result.nominalCapitalAtHorizon,
        coveragePct: result.coveragePct,
      },
      { formatCurrency: (n) => formatCurrency(symbol, n) },
    );
  }, [inputs, result, symbol]);

  const assumptions = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: 'Mode', value: inputs.mode === 'withdrawal' ? 'Monthly Withdrawal' : 'Compounding Growth' },
      { label: 'Currency', value: inputs.currency.code },
      { label: 'Starting capital', value: formatCurrency(symbol, inputs.startingCapital) },
      { label: 'Return', value: `${formatNum(inputs.expectedAnnualReturnPct, 1)}% / yr` },
      { label: 'Top-up', value: inputs.monthlyTopUp > 0 ? `${formatCurrency(symbol, inputs.monthlyTopUp)} / mo` : 'None' },
      { label: 'Inflation', value: inputs.inflationEnabled ? `${formatNum(inputs.inflationPct, 1)}% / yr` : 'Off' },
      { label: 'Cash buffer', value: `${formatNum(inputs.cashBufferPct, 0)}% @ ${formatNum(inputs.cashAPY, 1)}%` },
      { label: 'Reinvestment', value: `${formatNum(inputs.reinvestmentSplitPct, 0)}%` },
    ];

    if (inputs.mode === 'withdrawal') {
      items.splice(2, 0, { label: 'Target income', value: `${formatCurrency(symbol, inputs.targetMonthlyIncome)} / mo` });
      items.push({
        label: 'Withdrawal rule',
        value:
          inputs.withdrawalRule === 'fixed'
            ? 'Fixed amount'
            : `${formatNum(inputs.withdrawalPctOfCapital, 1)}% of capital / mo`,
      });
    } else {
      items.splice(2, 0, { label: 'Target capital', value: formatCurrency(symbol, inputs.targetFutureCapital) });
    }

    return items;
  }, [inputs, symbol]);

  return (
    <div className="report">
      {/* Page 1 */}
      <section className="section">
        <div className="header-band">
          <h1 className="title">{APP_NAME} — Report</h1>
          <div className="date">{dateLabel}</div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-label">Structure Overview</h2>
        <div className="kpi-grid">
          {structureKpis.map((kpi) => (
            <div key={kpi.label} className="kpi">
              <p className="label">{kpi.label}</p>
              <p className={`value ${kpi.tone ?? ''}`.trim()}>{kpi.value}</p>
              <p className="sub">{kpi.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-label">Horizon Status</h2>
        <div className="horizon-row">
          <span className={`badge ${badgeClass}`}>{tierLabel}</span>
          <div className="horizon-metrics">
            <div className="m-label">Coverage</div>
            <div className="m-value">{formatNum(coveragePct, 1)}%</div>
            <div className="m-label">Horizon</div>
            <div className="m-value">{horizonText}</div>
          </div>
        </div>
      </section>

      {/* Page 2 */}
      <div className="page-break" />

      <section className="section">
        <h2 className="section-label">Capital Over Time</h2>
        <div className="chart-box">
          <AreaChart
            width={720}
            height={240}
            data={chartPoints}
            margin={{ top: 10, right: 12, left: 0, bottom: 18 }}
          >
            <CartesianGrid stroke="rgba(229,231,235,1)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(m) => (m % 12 === 0 ? `${m / 12}y` : '')}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(v) => formatCompact(Number(v))}
              width={52}
            />
            <ReferenceLine x={0} stroke="#374151" strokeDasharray="4 3" />
            <Area
              type="monotone"
              dataKey="nominal"
              stroke="#111827"
              strokeWidth={1.25}
              fill="rgba(17,24,39,0.08)"
              isAnimationActive={false}
            />
          </AreaChart>
          <p className="chart-note">Start Month marker is at Month 0 (left dashed line).</p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-label">Your Assumptions</h2>
        <div className="chips">
          {assumptions.map((a) => (
            <div key={a.label} className="chip">
              <div className="c-label">{a.label}</div>
              <div className="c-value">{a.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Page 3 */}
      <div className="page-break" />

      <section className="section">
        <h2 className="section-label">Results</h2>
        <div className="kpi-grid">
          <div className="kpi">
            <p className="label">{inputs.mode === 'withdrawal' ? 'How long money lasts' : `Capital (${formatNum(inputs.timeHorizonYears, 1)} yr)`}</p>
            <p className="value">
              {inputs.mode === 'withdrawal' ? result.runwayPhrase : formatCurrency(symbol, result.nominalCapitalAtHorizon)}
            </p>
            <p className="sub">{inputs.mode === 'withdrawal' ? 'Runway under target withdrawals' : 'Projected capital at horizon'}</p>
          </div>

          <div className="kpi">
            <p className="label">Total withdrawals</p>
            <p className="value">{formatCurrency(symbol, result.totalWithdrawalsPaid)}</p>
            <p className="sub">Total paid over the horizon</p>
          </div>

          <div className="kpi">
            <p className="label">Total contributions</p>
            <p className="value">{formatCurrency(symbol, result.totalContributions)}</p>
            <p className="sub">Starting capital + top-ups</p>
          </div>

          <div className="kpi">
            <p className="label">Capital at horizon</p>
            <p className="value">{formatCurrency(symbol, result.nominalCapitalAtHorizon)}</p>
            <p className="sub">End-of-horizon capital</p>
          </div>
        </div>
        <div className="divider" />

        <div className="callout">
          <h4>THE LION&apos;S VERDICT</h4>
          <p className="sub" style={{ marginBottom: 8, fontWeight: 600 }}>
            Lion score: {lionClient.verdict.score} / 100 · {formatLionPublicStatusLabel(lionClient.verdict.status)}
          </p>
          <p className="headline">{lionClient.verdict.summary}</p>
          <p className="body">{lionClient.risks.join(' ')}</p>
          <p className="sig">{lionClient.closing_line}</p>
        </div>

        <div className="disclaimer">
          <div>This calculator is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.</div>
          <div style={{ marginTop: 6 }}>Please save or print a copy for your records.</div>
        </div>
      </section>
    </div>
  );
}

