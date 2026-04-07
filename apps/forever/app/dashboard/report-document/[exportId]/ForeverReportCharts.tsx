import type { ReactNode } from "react";
import { FOREVER_REPORT_CHART_COLORS } from "./foreverReportDerived";

const { green, muted, support, need: needBarColor, gap: gapBarColor, greenMid } = FOREVER_REPORT_CHART_COLORS;

/**
 * Plot chrome only (axes + SVG). Pair with `PdfChartBlock` from `@cb/pdf/shared` for
 * title → what → why → figure → interpretation (STEP 5 chart system).
 */
export function ChartPlotFrame({
  yAxisLabel,
  xAxisLabel,
  children,
}: {
  yAxisLabel: string;
  xAxisLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="cb-chart-block cb-report-chart-wrap cb-advisory-chart-frame cb-advisory-doc-chart-block mt-0 overflow-visible">
      <div className="cb-advisory-chart-plot-row relative flex gap-1 overflow-visible">
        <span
          className="flex w-[3em] flex-shrink-0 items-center justify-center text-[8pt] font-semibold leading-tight text-[#0d3a1d]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {yAxisLabel}
        </span>
        <div className="cb-chart-container cb-advisory-chart-svg-wrap min-w-0 flex-1 overflow-visible">{children}</div>
      </div>
      <div className="mt-1 text-center text-[8pt] font-semibold text-[#0d3a1d]">{xAxisLabel}</div>
    </div>
  );
}

export function ProgressBarTile({
  label,
  percent,
  formatHint,
}: {
  label: string;
  percent: number;
  formatHint: string;
}) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="cb-advisory-progress-tile cb-advisory-doc-progress-tile cb-keep-together mt-3 rounded-md border border-[rgba(13,58,29,0.2)] bg-[#f7faf7] p-3 print:border-[rgba(13,58,29,0.25)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9pt] font-semibold text-[#0d3a1d]">{label}</span>
        <span className="text-[11pt] font-bold tabular-nums text-[#0d3a1d]">{p.toFixed(1)}%</span>
      </div>
      <div className="cb-pdf-progress-track mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(13,58,29,0.12)]">
        <div
          className="cb-pdf-progress-fill h-full rounded-full bg-[#1B4D3E]"
          style={{ width: `${p}%` }}
          role="presentation"
        />
      </div>
      <p className="mt-2 mb-0 text-[8.5pt] leading-snug text-[rgba(43,43,43,0.9)]">{formatHint}</p>
    </div>
  );
}

type MoneyFmt = (n: number) => string;

function niceMax(values: number[]): number {
  const m = Math.max(1e-9, ...values.map((v) => Math.abs(v)));
  const exp = Math.floor(Math.log10(m));
  const step = 10 ** exp;
  return Math.ceil(m / step) * step;
}

export function NeedSupportedGapBars({
  need,
  supported,
  gap,
  formatMoney,
}: {
  need: number;
  supported: number;
  gap: number;
  formatMoney: MoneyFmt;
}) {
  const maxY = niceMax([need, supported, gap]);
  const W = 600;
  const H = 200;
  const padL = 102;
  const padR = 48;
  const padT = 12;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barW = 56;
  const gapX = 48;
  const x0 = padL + (innerW - (3 * barW + 2 * gapX)) / 2;
  const labels = ["Monthly need", "Supported (real return)", "Gap"];
  const vals = [need, supported, gap];
  const colors = [needBarColor, support, gapBarColor];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-full"
      role="img"
      aria-label="Bar chart comparing monthly need, supported draw, and gap"
    >
      <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(13,58,29,0.12)" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={8.5} fill={muted}>
              {formatMoney(maxY * t)}
            </text>
          </g>
        );
      })}
      {vals.map((v, i) => {
        const h = maxY > 0 ? (v / maxY) * innerH : 0;
        const x = x0 + i * (barW + gapX);
        const y = padT + innerH - h;
        return (
          <g key={labels[i]}>
            <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={4} fill={colors[i]} />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill={green}
            >
              {formatMoney(v)}
            </text>
            <text
              x={x + barW / 2}
              y={H - 14}
              textAnchor="middle"
              fontSize={8}
              fontWeight={600}
              fill={green}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Lifestyle → +property → −contribution → net annual draw (floating steps + total). */
export function WaterfallChart({
  lifestyleAnnual,
  propertyAnnual,
  contributionAnnual,
  netAnnualDraw,
  formatMoney,
}: {
  lifestyleAnnual: number;
  propertyAnnual: number;
  contributionAnnual: number;
  netAnnualDraw: number;
  formatMoney: MoneyFmt;
}) {
  const W = 620;
  const H = 228;
  const padL = 72;
  const padR = 44;
  const padT = 12;
  const padB = 62;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const p1 = lifestyleAnnual;
  const p2 = lifestyleAnnual + propertyAnnual;
  const p3 = netAnnualDraw;

  const maxY = niceMax([p1, p2, p3, propertyAnnual, contributionAnnual, 1]);
  const base = padT + innerH;
  const yAt = (v: number) => base - (v / maxY) * innerH;

  const n = 4;
  const slotW = innerW / n;
  const barW = Math.min(52, slotW * 0.62);

  const bars: { x: number; y: number; w: number; h: number; fill: string; label: string; val: string }[] = [
    {
      x: padL + 0 * slotW + (slotW - barW) / 2,
      y: yAt(p1),
      w: barW,
      h: base - yAt(p1),
      fill: muted,
      label: "Lifestyle spend",
      val: formatMoney(lifestyleAnnual),
    },
    {
      x: padL + 1 * slotW + (slotW - barW) / 2,
      y: yAt(p2),
      w: barW,
      h: yAt(p1) - yAt(p2),
      fill: "rgba(205,91,82,0.75)",
      label: "+ Property financing",
      val: formatMoney(propertyAnnual),
    },
    {
      x: padL + 2 * slotW + (slotW - barW) / 2,
      y: yAt(p2),
      w: barW,
      h: yAt(p3) - yAt(p2),
      fill: support,
      label: "− Family contribution",
      val: formatMoney(contributionAnnual),
    },
    {
      x: padL + 3 * slotW + (slotW - barW) / 2,
      y: yAt(p3),
      w: barW,
      h: base - yAt(p3),
      fill: greenMid,
      label: "= Net annual draw",
      val: formatMoney(p3),
    },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-full" role="img" aria-label="Waterfall chart">
      <rect width={W} height={H} fill="#fff" />
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke={green} strokeWidth={1} />
      {bars.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={b.w} height={Math.max(1, b.h)} rx={3} fill={b.fill} />
          <text x={b.x + b.w / 2} y={b.y - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={green}>
            {b.val}
          </text>
          <text x={b.x + b.w / 2} y={H - 28} textAnchor="middle" fontSize={7} fontWeight={600} fill={green}>
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function StackedAccessibilityBar({
  liquid,
  semi,
  illiquid,
  formatMoney,
}: {
  liquid: number;
  semi: number;
  illiquid: number;
  formatMoney: MoneyFmt;
}) {
  const total = liquid + semi + illiquid;
  const denom = total > 0 ? total : 1;
  const W = 580;
  const H = 72;
  const inner = W - 48;
  const parts = [
    { v: liquid, label: "Liquid (cash)", color: "#55b685" },
    { v: semi, label: "Semi-liquid (investments)", color: "#8fcf7a" },
    { v: illiquid, label: "Property / illiquid", color: greenMid },
  ];
  let x = 22;
  return (
    <svg viewBox={`0 0 ${W} ${H + 44}`} className="h-auto w-full max-w-full" role="img" aria-label="Stacked capital bar">
      <rect width={W} height={H + 44} fill="#fff" />
      {parts.map((p) => {
        const w = (p.v / denom) * inner;
        const cx = x + w / 2;
        const narrow = w < 56;
        const el = (
          <g key={p.label}>
            <rect x={x} y={12} width={Math.max(0, w)} height={H - 24} fill={p.color} rx={2} />
            <text
              x={cx}
              y={H + 8}
              textAnchor={narrow ? "start" : "middle"}
              fontSize={7.5}
              fill={green}
            >
              {p.label}
            </text>
            <text
              x={cx}
              y={H + 24}
              textAnchor={narrow ? "start" : "middle"}
              fontSize={7.5}
              fontWeight={700}
              fill={green}
            >
              {formatMoney(p.v)}
            </text>
          </g>
        );
        x += w;
        return el;
      })}
    </svg>
  );
}

export function CapitalRunwayLineChart({
  series,
  depletionYear,
  formatMoney,
}: {
  series: { year: number; balance: number }[];
  depletionYear: number | null;
  formatMoney: MoneyFmt;
}) {
  const W = 580;
  const H = 220;
  const padL = 100;
  const padR = 48;
  const padT = 12;
  const padB = 42;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = niceMax(series.map((s) => s.balance));
  const maxX = Math.max(1, series[series.length - 1]?.year ?? 1);

  const px = (yr: number) => padL + (yr / maxX) * innerW;
  const py = (bal: number) => padT + innerH - (maxY > 0 ? (bal / maxY) * innerH : 0);

  const d = series.map((s, i) => `${i === 0 ? "M" : "L"} ${px(s.year).toFixed(1)} ${py(s.balance).toFixed(1)}`).join(" ");

  const depletionX = depletionYear !== null && depletionYear <= maxX ? px(depletionYear) : null;
  const depletionAnchor =
    depletionX !== null && depletionX > W - padR - 78 ? "end" : "start";
  const depletionTx =
    depletionX !== null ? (depletionAnchor === "end" ? depletionX - 4 : depletionX + 4) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-full" role="img" aria-label="Capital over time">
      <rect width={W} height={H} fill="#fff" />
      {[0, 0.5, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(13,58,29,0.1)" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={8.5} fill={muted}>
              {formatMoney(maxY * t)}
            </text>
          </g>
        );
      })}
      <path d={d} fill="none" stroke={greenMid} strokeWidth={2.5} />
      {series.map((s) => (
        <circle key={s.year} cx={px(s.year)} cy={py(s.balance)} r={3} fill={greenMid} />
      ))}
      {depletionYear !== null && depletionYear <= maxX && depletionX !== null ? (
        <g>
          <line
            x1={depletionX}
            y1={padT}
            x2={depletionX}
            y2={padT + innerH}
            stroke={gapBarColor}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <text
            x={depletionTx}
            y={padT + 14}
            textAnchor={depletionAnchor}
            fontSize={8}
            fontWeight={700}
            fill={gapBarColor}
          >
            Depletion ~Y{depletionYear}
          </text>
        </g>
      ) : null}
      <text x={padL} y={H - 10} fontSize={8} fill={muted}>
        0
      </text>
      <text x={W - padR} y={H - 10} textAnchor="end" fontSize={8} fill={muted}>
        {maxX} yrs
      </text>
    </svg>
  );
}

export function LiquidityHaircutBars({
  rows,
  formatMoney,
}: {
  rows: { pct: number; effective: number }[];
  formatMoney: MoneyFmt;
}) {
  const W = 560;
  const H = 200;
  const padL = 82;
  const padR = 40;
  const padT = 8;
  const padB = 46;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = niceMax(rows.map((r) => r.effective));
  const barW = (innerW / rows.length) * 0.55;
  const step = innerW / rows.length;
  const n = rows.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-full" role="img" aria-label="Effective capital by property access">
      <rect width={W} height={H} fill="#fff" />
      {[0, 0.5, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <line key={t} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(13,58,29,0.1)" strokeWidth={1} />
        );
      })}
      {rows.map((r, i) => {
        const h = maxY > 0 ? (r.effective / maxY) * innerH : 0;
        const x = padL + i * step + (step - barW) / 2;
        const y = padT + innerH - h;
        const cx = x + barW / 2;
        const bottomAnchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
        const bottomDx = i === 0 ? 2 : i === n - 1 ? -2 : 0;
        return (
          <g key={r.pct}>
            <rect x={x} y={y} width={barW} height={h} rx={3} fill={i === rows.length - 1 ? greenMid : "rgba(27,77,62,0.55)"} />
            <text x={cx} y={y - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={green}>
              {formatMoney(r.effective)}
            </text>
            <text
              x={cx + bottomDx}
              y={H - 14}
              textAnchor={bottomAnchor}
              fontSize={8}
              fontWeight={600}
              fill={green}
            >
              {Math.round(r.pct * 100)}% access
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SensitivityLineChart({
  points,
}: {
  points: { label: string; years: number | null }[];
}) {
  const W = 560;
  const H = 200;
  const padL = 78;
  const padR = 40;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const numeric = points.map((p) => p.years).filter((y): y is number => y !== null && Number.isFinite(y));
  const maxY = Math.max(50, numeric.length > 0 ? niceMax(numeric) : 25);
  const n = points.length;
  const slot = innerW / (n - 1 || 1);

  const coords = points.map((p, i) => {
    const perpetual = p.years === null || !Number.isFinite(p.years);
    const yv = perpetual ? maxY : p.years!;
    const x = padL + i * slot;
    const y = padT + innerH - (maxY > 0 ? (yv / maxY) * innerH : 0);
    return { x, y, label: p.label, years: p.years, perpetual };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-full" role="img" aria-label="Sensitivity line chart">
      <rect width={W} height={H} fill="#fff" />
      {[0, 0.5, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(13,58,29,0.1)" strokeWidth={1} />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={8} fill={muted}>
              {(maxY * t).toFixed(0)}y
            </text>
          </g>
        );
      })}
      <path d={d} fill="none" stroke={greenMid} strokeWidth={2} />
      {coords.map((c, i) => {
        const bottomAnchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
        const bottomDx = i === 0 ? 2 : i === n - 1 ? -2 : 0;
        const topAnchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
        const topDx = i === 0 ? 2 : i === n - 1 ? -2 : 0;
        return (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r={4} fill={greenMid} />
            <text
              x={c.x + bottomDx}
              y={H - 16}
              textAnchor={bottomAnchor}
              fontSize={8}
              fontWeight={600}
              fill={green}
            >
              {c.label}
            </text>
            {c.perpetual ? (
              <text x={c.x + topDx} y={c.y - 10} textAnchor={topAnchor} fontSize={8} fill={muted}>
                Perpetual
              </text>
            ) : (
              <text x={c.x + topDx} y={c.y - 10} textAnchor={topAnchor} fontSize={8} fontWeight={700} fill={green}>
                {c.years!.toFixed(1)} yrs
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
