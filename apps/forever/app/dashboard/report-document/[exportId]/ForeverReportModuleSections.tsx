import { ReportHeading, ReportKeyValueGrid, ReportProse } from "@cb/advisory-graph/reports";
import { ExpenseType } from "@/legacy/types";
import type { ForeverDerivedModel } from "./foreverReportDerived";
import {
  CapitalRunwayLineChart,
  ChartCaptionBlock,
  ChartFrame,
  LiquidityHaircutBars,
  NeedSupportedGapBars,
  SensitivityLineChart,
  StackedAccessibilityBar,
  WaterfallChart,
} from "./ForeverReportCharts";

type MoneyFmt = (n: number) => string;

/** Chart-heavy modules allow page breaks between blocks; use `cb-keep-together` only on compact units (card grid, appendix CTA). */
const MODULE_CLASS = "cb-module cb-section";

export function ForeverReportModuleSections({
  derived,
  formatMoney,
}: {
  derived: NonNullable<ForeverDerivedModel>;
  formatMoney: MoneyFmt;
}) {
  const { computed, waterfall, stack, capitalCurve, depletionYear, liquidityHaircuts, sensitivityReturn, sensitivityInflation, baseReturn, baseInflation } =
    derived;

  const levers = [
    {
      title: "Expense & lifestyle",
      body: `Net monthly draw is ${formatMoney(derived.monthlyNeed)}. Even small reductions in recurring spend materially extend runway when real returns are positive.`,
    },
    {
      title: "Family / household contribution",
      body: `Offsets of ${formatMoney(computed.familyContribution)}/mo reduce the burden on investable capital. Changes here flow straight into the annual draw calculation.`,
    },
    {
      title: "Liquidity & property access",
      body: `Property is ${formatMoney(stack.illiquid)} of ${formatMoney(computed.currentAssets)} total. Haircuts on realisable value (see liquidity analysis in DEEPER ANALYSIS) change effective capital available for planning.`,
    },
    {
      title: "Return & inflation assumptions",
      body: `Stated nominal return ${baseReturn.toFixed(1)}% and inflation ${baseInflation.toFixed(1)}% imply ~${computed.realReturnRate.toFixed(2)}% real. DEEPER ANALYSIS includes ±1% sensitivity charts on runway.`,
    },
  ];

  return (
    <>
      <section className="cb-page cb-page-break" aria-label="Section B — Advisor Read">
        <header className="cb-advisory-doc-section-divider">
          <div className="cb-print-stage-label cb-advisory-doc-stage-label">Section B — Advisor Read</div>
          <ReportHeading level={2} variant="sectionSmall" className="cb-advisory-doc-section-divider-title">
            Advisor Read
          </ReportHeading>
        </header>
        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Your retirement system (in one view)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Compare what you need each month against what portfolio real returns can sustainably support, and the remaining gap (if any).
          </ReportProse>
          <ChartFrame
            title="Monthly need vs supported draw vs gap"
            subtitle="Why this matters: this is the cash-flow spine of the Forever Income model — it connects lifestyle, offsets, and capital market assumptions."
            yAxisLabel="Monthly amount"
            xAxisLabel="Category"
            caption={
              <ChartCaptionBlock
                what="Three bars: required monthly draw after offsets, estimated sustainable draw from stated real return, and the shortfall."
                why="Advisers use this to prioritise levers (spend, contribution, liquidity, assumptions) before tactical portfolio moves."
                notice={
                  derived.monthlyGap > 0
                    ? "A positive gap means current capital, at stated real return, does not fully fund the monthly draw."
                    : "No monthly gap on these assumptions — sustainability still depends on inputs holding and capital staying invested."
                }
              />
            }
          >
            <NeedSupportedGapBars
              need={derived.monthlyNeed}
              supported={derived.monthlySupported}
              gap={derived.monthlyGap}
              formatMoney={formatMoney}
            />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Next 30 days: pick one lever
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Use this as a facilitation frame: one deliberate change in the next month beats unfocused optimisation.
          </ReportProse>
          <div className="cb-advisory-doc-card-grid cb-keep-together mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {levers.map((L) => (
              <div
                key={L.title}
                className="cb-pdf-lever-card rounded-md border border-[rgba(13,58,29,0.18)] bg-[#fafbf9] p-3 text-[9.5pt] leading-snug text-[#0d3a1d]"
              >
                <p className="m-0 font-bold text-[#0d3a1d]">{L.title}</p>
                <p className="mt-1.5 mb-0 text-[rgba(43,43,43,0.95)]">{L.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Inputs that drive the outcome
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Annual lifestyle spend, property financing, and household contributions combine into the net draw the portfolio must sustain.
          </ReportProse>
          <ChartFrame
            title="Spend + financing − offsets = net annual draw"
            subtitle="Why this matters: the model's capital requirement is driven by this net figure and your real return assumption."
            yAxisLabel="Annual amount"
            xAxisLabel="Build-up step"
            caption={
              <ChartCaptionBlock
                what="Waterfall from lifestyle spend, add property financing, subtract family contribution, to net annual draw."
                why="Clients often underestimate how financing and offsets move the true burden on capital."
                notice={
                  waterfall.propertyAnnual > 0
                    ? "Property financing adds to gross spend before contributions reduce the net draw."
                    : "With no financing line in the model, net draw is driven mainly by lifestyle and contributions."
                }
              />
            }
          >
            <WaterfallChart
              lifestyleAnnual={waterfall.lifestyleAnnual}
              propertyAnnual={waterfall.propertyAnnual}
              contributionAnnual={waterfall.contributionAnnual}
              netAnnualDraw={waterfall.netAnnualDraw}
              formatMoney={formatMoney}
            />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Capital stack &amp; accessibility
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Liquid, semi-liquid, and illiquid buckets affect how quickly capital can respond to cash-flow stress.
          </ReportProse>
          <ChartFrame
            title="How capital is stacked today"
            subtitle="Why this matters: accessibility shapes resilience even when headline net worth looks adequate."
            yAxisLabel="Share of total"
            xAxisLabel="Capital type (100% = total assets)"
            caption={
              <ChartCaptionBlock
                what="One horizontal stacked bar: cash, investments, and property / illiquid capital."
                why="Advisers stress-test whether liquid buffers match the monthly gap and refinancing flexibility."
                notice="Illiquid capital may not be available at par — see the liquidity haircut analysis later in DEEPER ANALYSIS."
              />
            }
          >
            <StackedAccessibilityBar liquid={stack.liquid} semi={stack.semi} illiquid={stack.illiquid} formatMoney={formatMoney} />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Runway curve (capital over time)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            A simplified projection: capital compounds at the stated real rate while funding the net annual draw. Not a forecast — a mechanical illustration of stated inputs.
          </ReportProse>
          <ChartFrame
            title="Capital balance vs years (illustrative)"
            subtitle="Why this matters: shows how quickly the stack would decline if assumptions held and draws continued."
            yAxisLabel="Capital balance"
            xAxisLabel="Years from today"
            caption={
              <ChartCaptionBlock
                what="Line connects year-end balances after growth minus the annual draw from the model."
                why="Pairs with the headline runway figure for a visual sense of trajectory."
                notice={
                  depletionYear !== null
                    ? `Approximate depletion marker around year ${depletionYear} on these static assumptions.`
                    : "Balance does not hit zero within the illustrated horizon — check headline runway for 'Perpetual' or longer horizons."
                }
              />
            }
          >
            <CapitalRunwayLineChart
              series={capitalCurve}
              depletionYear={depletionYear}
              formatMoney={formatMoney}
            />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Levers ranked (adviser framing)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Ranked for <strong>this</strong> snapshot — not universal advice. Re-rank after material changes to income, debt, or goals.
          </ReportProse>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-[10pt] leading-snug text-[#0d3a1d]">
            <li>
              <strong>Validate assumptions</strong> — return and inflation drive capital required; small changes move runway (see sensitivity charts in DEEPER ANALYSIS).
            </li>
            <li>
              <strong>Close the monthly gap</strong> —{" "}
              {derived.monthlyGap > 0
                ? `Currently ~${formatMoney(derived.monthlyGap)}/mo on stated returns.`
                : "No residual monthly gap on stated returns — monitor drift in spend or capital."}
            </li>
            <li>
              <strong>Liquidity &amp; property access</strong> — align draw strategy with how much of {formatMoney(stack.illiquid)} is realistically accessible.
            </li>
            <li>
              <strong>Portfolio implementation</strong> — asset mix and fees matter after the cash-flow spine is credible.
            </li>
          </ol>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Where to go next
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Bring this export to your next review with three prompts: (1) which assumption you would stress-test first, (2) one lever you will actually move in 30 days, and (3) what evidence would
            change your mind.
          </ReportProse>
          <ReportProse className="text-[rgba(43,43,43,0.92)]">
            The Forever Income model is illustrative. It does not replace cash-flow modelling, tax, estate, or product advice — it orients the conversation before those layers.
          </ReportProse>
        </div>
      </section>

      <section className="cb-page cb-page-break" aria-label="Section C — DEEPER ANALYSIS (Evidence and Sensitivity)">
        <header className="cb-advisory-doc-section-divider">
          <div className="cb-print-stage-label cb-advisory-doc-stage-label">Section C — DEEPER ANALYSIS (Evidence &amp; Sensitivity)</div>
          <ReportHeading level={2} variant="sectionSmall" className="cb-advisory-doc-section-divider-title">
            DEEPER ANALYSIS
          </ReportHeading>
        </header>
        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Assumptions &amp; definitions (audit panel)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Snapshot values used for every chart in this PDF. Currency and expense basis follow what you entered at export.
          </ReportProse>
          <ReportHeading
            level={3}
            variant="inline"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Model inputs
          </ReportHeading>
          <ReportKeyValueGrid
            className="cb-forever-kv-grid"
            rows={[
              { key: "Currency", value: derived.currencyCode },
              { key: "Expense basis", value: derived.inputs.expenseType === ExpenseType.ANNUAL ? "Annual" : "Monthly" },
              {
                key: derived.inputs.expenseType === ExpenseType.ANNUAL ? "Annual expense" : "Monthly expense",
                value: formatMoney(derived.inputs.expense),
              },
              {
                key:
                  derived.inputs.expenseType === ExpenseType.ANNUAL
                    ? "Annual family contribution"
                    : "Monthly family contribution",
                value: formatMoney(derived.inputs.familyContribution),
              },
              { key: "Expected return (nominal % p.a.)", value: String(derived.inputs.expectedReturn) },
              { key: "Inflation (% p.a.)", value: String(derived.inputs.inflationRate) },
              { key: "Cash", value: formatMoney(derived.inputs.cash) },
              { key: "Investments", value: formatMoney(derived.inputs.investments) },
              { key: "Real estate (equity / value)", value: formatMoney(derived.inputs.realEstate) },
              { key: "Property financing rate (% p.a.)", value: String(derived.inputs.propertyLoanCost) },
              { key: "Property horizon (years)", value: String(derived.inputs.propertyTimeHorizon) },
            ]}
          />
          <ReportHeading
            level={3}
            variant="inline"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Key outcomes
          </ReportHeading>
          <ReportKeyValueGrid
            className="cb-forever-kv-grid"
            rows={[
              {
                key: "Progress to target",
                value: `${computed.progressPercent.toFixed(1)}%`,
              },
              {
                key: "Capital required (real terms)",
                value: Number.isFinite(computed.capitalNeeded) ? formatMoney(computed.capitalNeeded) : "—",
              },
              { key: "Current investable assets", value: formatMoney(computed.currentAssets) },
              { key: "Gap / surplus", value: formatMoney(computed.gap) },
              { key: "Monthly dependency (normalised)", value: formatMoney(computed.monthlyExpense) },
              {
                key: "Sustainable on stated assumptions",
                value: computed.isSustainable ? "Yes" : "No",
              },
              { key: "Runway / horizon", value: computed.runway },
            ]}
          />
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Liquidity haircut analysis
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Effective capital if only a fraction of property value were accessible (illustrative haircuts on the property bucket only).
          </ReportProse>
          <ChartFrame
            title="Effective capital under property access scenarios"
            subtitle="Why this matters: planning on full property value can overstate flexibility in stress."
            yAxisLabel="Effective capital"
            xAxisLabel="Property realisation %"
            caption={
              <ChartCaptionBlock
                what="Bars show cash + investments + (property × access %) for 60%, 70%, 80%, and 100%."
                why="Stress-tests how much capital is actually available without selling other sleeves."
                notice="Compare effective capital to capital required in the assumptions panel above when property is a large share of the stack."
              />
            }
          >
            <LiquidityHaircutBars rows={liquidityHaircuts} formatMoney={formatMoney} />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Sensitivity: return (±1% p.a.)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Nominal return shifted ±1 point around your input; inflation held constant. Runway is recomputed from the same engine as the dashboard.
          </ReportProse>
          <ChartFrame
            title="Runway vs nominal return"
            subtitle="Why this matters: return assumptions dominate capital-required maths in withdrawal models."
            yAxisLabel="Illustrative runway (years)"
            xAxisLabel="Nominal return scenario"
            caption={
              <ChartCaptionBlock
                what="Points show model runway at −1%, base, and +1% nominal return."
                why="Shows how sensitive the headline horizon is to a single input."
                notice="Wide swings suggest spending more time validating capital market expectations with the client."
              />
            }
          >
            <SensitivityLineChart points={sensitivityReturn} />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Sensitivity: inflation (±1% p.a.)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Inflation shifted ±1 point around your input; nominal return held constant.
          </ReportProse>
          <ChartFrame
            title="Runway vs inflation"
            subtitle="Why this matters: higher inflation erodes real return and shortens sustainable runway for the same nominal portfolio."
            yAxisLabel="Illustrative runway (years)"
            xAxisLabel="Inflation scenario"
            caption={
              <ChartCaptionBlock
                what="Points show model runway at −1%, base, and +1% inflation."
                why="Pairs with the return chart to show two largest macro levers in this simple engine."
                notice="If both sensitivities look fragile, the base case may be too optimistic for planning."
              />
            }
          >
            <SensitivityLineChart points={sensitivityInflation} />
          </ChartFrame>
        </div>

        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Methodology &amp; scope
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Forever Income uses a single-period style real return, constant draw, and simplified property repayment logic. It does not model sequence-of-returns path dependency, tax, fees inside
            products, currency translation, or behavioural spending shocks.
          </ReportProse>
          <ReportProse className="text-[rgba(43,43,43,0.92)]">
            Charts in this PDF are rendered from the stored calculator snapshot at export time. They are for discussion with a professional adviser and must not be read as a guarantee of future
            outcomes.
          </ReportProse>
        </div>
      </section>
    </>
  );
}
