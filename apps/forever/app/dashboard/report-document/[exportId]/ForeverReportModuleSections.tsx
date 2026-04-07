import { PdfAdvisorySectionLead, PdfChartBlock, PdfSection } from "@cb/pdf/shared";
import { ReportHeading, ReportKeyValueGrid, ReportProse } from "@cb/advisory-graph/reports";
import { ExpenseType } from "@/legacy/types";
import type { ForeverDerivedModel } from "./foreverReportDerived";
import {
  CapitalRunwayLineChart,
  ChartPlotFrame,
  LiquidityHaircutBars,
  NeedSupportedGapBars,
  SensitivityLineChart,
  StackedAccessibilityBar,
  WaterfallChart,
} from "./ForeverReportCharts";

type MoneyFmt = (n: number) => string;

function foreverChartWhy(subtitle: string, captionWhy: string): string {
  const stripped = subtitle.replace(/^Why this matters:\s*/i, "").trim();
  return stripped ? `${stripped} ${captionWhy}` : captionWhy;
}

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
      <PdfSection className="cb-page-break" aria-label="Section B — Advisor Read">
        <PdfAdvisorySectionLead
          stageLabel="Section B — Advisor Read"
          title="Advisor Read"
          whatThisShows="Charts and tables that turn your stated inputs into monthly need versus sustainable draw, capital stack, runway, levers, and liquidity trade-offs."
          whyThisMatters="The adviser's working view — enough structure to decide what to discuss next without wading through every assumption at once."
        />
        <div className={MODULE_CLASS}>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Your Forever Income (in one view)
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            Compare what you need each month against what portfolio real returns can sustainably support, and the remaining gap (if any).
          </ReportProse>
          <PdfChartBlock
            title="Monthly need vs supported draw vs gap"
            whatThisShows="Three bars: required monthly draw after offsets, estimated sustainable draw from stated real return, and the shortfall."
            whyThisMatters={foreverChartWhy(
              "Why this matters: this is the cash-flow spine of the Forever Income model — it connects lifestyle, offsets, and capital market assumptions.",
              "Advisers use this to prioritise levers (spend, contribution, liquidity, assumptions) before tactical portfolio moves.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong>{" "}
                {derived.monthlyGap > 0
                  ? "A positive gap means current capital, at stated real return, does not fully fund the monthly draw."
                  : "No monthly gap on these assumptions — sustainability still depends on inputs holding and capital staying invested."}
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Monthly amount" xAxisLabel="Category">
              <NeedSupportedGapBars
                need={derived.monthlyNeed}
                supported={derived.monthlySupported}
                gap={derived.monthlyGap}
                formatMoney={formatMoney}
              />
            </ChartPlotFrame>
          </PdfChartBlock>
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
            One deliberate change in the next thirty days usually beats scattering effort across many small tweaks.
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
          <PdfChartBlock
            title="Spend + financing − offsets = net annual draw"
            whatThisShows="Waterfall from lifestyle spend, add property financing, subtract family contribution, to net annual draw."
            whyThisMatters={foreverChartWhy(
              "Why this matters: the model's capital requirement is driven by this net figure and your real return assumption.",
              "Clients often underestimate how financing and offsets move the true burden on capital.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong>{" "}
                {waterfall.propertyAnnual > 0
                  ? "Property financing adds to gross spend before contributions reduce the net draw."
                  : "With no financing line in the model, net draw is driven mainly by lifestyle and contributions."}
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Annual amount" xAxisLabel="Build-up step">
              <WaterfallChart
                lifestyleAnnual={waterfall.lifestyleAnnual}
                propertyAnnual={waterfall.propertyAnnual}
                contributionAnnual={waterfall.contributionAnnual}
                netAnnualDraw={waterfall.netAnnualDraw}
                formatMoney={formatMoney}
              />
            </ChartPlotFrame>
          </PdfChartBlock>
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
          <PdfChartBlock
            title="How capital is stacked today"
            whatThisShows="One horizontal stacked bar: cash, investments, and property / illiquid capital."
            whyThisMatters={foreverChartWhy(
              "Why this matters: accessibility shapes resilience even when headline net worth looks adequate.",
              "Advisers stress-test whether liquid buffers match the monthly gap and refinancing flexibility.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong> Illiquid capital may not be available at par — see the liquidity haircut analysis later in DEEPER
                ANALYSIS.
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Share of total" xAxisLabel="Capital type (100% = total assets)">
              <StackedAccessibilityBar liquid={stack.liquid} semi={stack.semi} illiquid={stack.illiquid} formatMoney={formatMoney} />
            </ChartPlotFrame>
          </PdfChartBlock>
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
          <PdfChartBlock
            title="Capital balance vs years (illustrative)"
            whatThisShows="Line connects year-end balances after growth minus the annual draw from the model."
            whyThisMatters={foreverChartWhy(
              "Why this matters: shows how quickly the stack would decline if assumptions held and draws continued.",
              "Pairs with the headline runway figure for a visual sense of trajectory.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong>{" "}
                {depletionYear !== null
                  ? `Approximate depletion marker around year ${depletionYear} on these static assumptions.`
                  : "Balance does not hit zero within the illustrated horizon — check headline runway for 'Perpetual' or longer horizons."}
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Capital balance" xAxisLabel="Years from today">
              <CapitalRunwayLineChart series={capitalCurve} depletionYear={depletionYear} formatMoney={formatMoney} />
            </ChartPlotFrame>
          </PdfChartBlock>
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
      </PdfSection>

      <PdfSection className="cb-page-break" aria-label="Section C — DEEPER ANALYSIS (Evidence and Sensitivity)">
        <PdfAdvisorySectionLead
          stageLabel="Section C — DEEPER ANALYSIS (Evidence & Sensitivity)"
          title="Deeper analysis"
          whatThisShows="Evidence behind the headline view: the assumptions on file, liquidity haircuts, and small moves (±1%) in return and inflation."
          whyThisMatters="Checks whether the Section B story still holds if markets or spending drift — a conversation starter, not a prediction."
        />
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
          <PdfChartBlock
            title="Effective capital under property access scenarios"
            whatThisShows="Bars show cash + investments + (property × access %) for 60%, 70%, 80%, and 100%."
            whyThisMatters={foreverChartWhy(
              "Why this matters: planning on full property value can overstate flexibility in stress.",
              "Stress-tests how much capital is actually available without selling other sleeves.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong> Compare effective capital to capital required in the assumptions panel above when property is a large
                share of the stack.
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Effective capital" xAxisLabel="Property realisation %">
              <LiquidityHaircutBars rows={liquidityHaircuts} formatMoney={formatMoney} />
            </ChartPlotFrame>
          </PdfChartBlock>
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
          <PdfChartBlock
            title="Runway vs nominal return"
            whatThisShows="Points show model runway at −1%, base, and +1% nominal return."
            whyThisMatters={foreverChartWhy(
              "Why this matters: return assumptions dominate capital-required maths in withdrawal models.",
              "Shows how sensitive the headline horizon is to a single input.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong> Wide swings suggest spending more time validating capital market expectations with the client.
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Illustrative runway (years)" xAxisLabel="Nominal return scenario">
              <SensitivityLineChart points={sensitivityReturn} />
            </ChartPlotFrame>
          </PdfChartBlock>
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
          <PdfChartBlock
            title="Runway vs inflation"
            whatThisShows="Points show model runway at −1%, base, and +1% inflation."
            whyThisMatters={foreverChartWhy(
              "Why this matters: higher inflation erodes real return and shortens sustainable runway for the same nominal portfolio.",
              "Pairs with the return chart to show two largest macro levers in this simple engine.",
            )}
            interpretation={
              <>
                <strong>What to notice:</strong> If both sensitivities look fragile, the base case may be too optimistic for planning.
              </>
            }
          >
            <ChartPlotFrame yAxisLabel="Illustrative runway (years)" xAxisLabel="Inflation scenario">
              <SensitivityLineChart points={sensitivityInflation} />
            </ChartPlotFrame>
          </PdfChartBlock>
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
      </PdfSection>
    </>
  );
}
