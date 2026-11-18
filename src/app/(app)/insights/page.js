import Link from "next/link";
import CategoryBars from "@/components/Insights/CategoryBars";
import ColumnChart from "@/components/Insights/ColumnChart";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import {
  billsByCategory,
  listRecurringItems,
  monthlySpending,
  recurringTotals,
  spendingBeyondBills,
  spendingByCategory,
} from "@/lib/finance";
import { formatMoney, formatMonth, todayIn } from "@/lib/format";
import { INSIGHT_RANGES, monthlySeries, parseInsightRange, rangeMonths, topCategories } from "@/lib/insights";

export const metadata = { title: "Insights · Household Finance Hub" };

function StatTile({ label, value, detail }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl leading-tight font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </article>
  );
}

// "Nov", or "Jan 27" for January and the first month, so a range across years stays unambiguous.
function shortMonth(isoDate, isFirst) {
  const [year, month] = isoDate.split("-").map(Number);
  const name = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return month === 1 || isFirst ? `${name} ${String(year).slice(2)}` : name;
}

export default async function InsightsPage({ searchParams }) {
  const { householdId, currency, timezone } = await requireHousehold();
  const money = amount => formatMoney(amount, currency);
  const today = todayIn(timezone);
  const rangeKey = parseInsightRange((await searchParams)?.range);
  const { months, from, to } = rangeMonths(rangeKey, today);

  const [spending, categories, recurring] = await Promise.all([
    monthlySpending(householdId, { from, to }),
    spendingByCategory(householdId, { from, to }),
    listRecurringItems(householdId),
  ]);
  const totals = recurringTotals(recurring);
  const bills = billsByCategory(recurring);
  const series = monthlySeries({
    months,
    spending: spending.map(row => ({ ...row, beyondBills: spendingBeyondBills(row.byCategory, bills) })),
    baseline: { income: totals.income, bills: totals.expenses },
    today,
  });

  const totalSpent = Math.round(series.reduce((sum, row) => sum + row.spent * 100, 0)) / 100;
  const completed = series.filter(row => !row.current);
  const average = completed.length ? completed.reduce((sum, row) => sum + row.spent, 0) / completed.length : null;
  const current = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const ranked = topCategories(categories).map(row => ({ ...row, totalLabel: money(row.total) }));

  const toPoint = (row, index, value) => ({
    key: row.month,
    label: shortMonth(row.month, index === 0),
    fullLabel: formatMonth(row.month),
    value,
    note: row.current ? "month in progress" : null,
  });
  const spentData = series.map((row, index) => toPoint(row, index, row.spent));
  const netData = series.map((row, index) => toPoint(row, index, row.net));
  // Label selectively: the current month and the extreme; the axis, tooltip and table carry the rest.
  const labelKeys = (data, size) => [data.at(-1).key, data.reduce((best, item) => (size(item) > size(best) ? item : best)).key];
  const spentLabels = labelKeys(spentData, item => item.value);
  const netLabels = labelKeys(netData, item => Math.abs(item.value));
  const rangeLabel = INSIGHT_RANGES.find(range => range.key === rangeKey).label.toLowerCase();

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">Insights</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">Where the money goes.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Spending over time, what&apos;s left each month, and the biggest categories.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        {/* One filter row above everything it scopes. */}
        <nav aria-label="Period" className="flex flex-wrap gap-2">
          {INSIGHT_RANGES.map(range => {
            const selected = range.key === rangeKey;
            return (
              <Link
                key={range.key}
                href={range.key === "6m" ? "/insights" : `/insights?range=${range.key}`}
                aria-current={selected ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white"
                }`}
              >
                {selected ? "✓ " : ""}
                {range.label}
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={`Spent, ${rangeLabel}`}
            value={money(totalSpent)}
            detail={`${months.length} month${months.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Average per month"
            value={average === null ? "—" : money(Math.round(average))}
            detail={average === null ? "No completed month in this period yet" : "Completed months only"}
          />
          <StatTile
            label="This month so far"
            value={money(current.spent)}
            detail={previous ? `${money(previous.spent)} last month` : null}
          />
          <StatTile
            label="Biggest category"
            value={ranked[0] && ranked[0].id !== "other" ? ranked[0].name : "—"}
            detail={ranked[0] && ranked[0].id !== "other" ? `${ranked[0].totalLabel} · ${ranked[0].share}% of spending` : "No spending yet"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Spending per month" subtitle="Logged expenses. The dashed line is your monthly income from the Budget page.">
            <ColumnChart
              title="Spending per month"
              data={spentData}
              currency={currency}
              labelKeys={spentLabels}
              valueHeading="Spent"
              reference={totals.income > 0 ? { value: totals.income, label: `Income ${money(totals.income)}` } : null}
            />
          </Panel>
          <Panel
            title="Left over each month"
            subtitle="Income minus fixed bills (both from your current Budget) minus other spending. Expenses in a bill's category only count above that bill, so nothing is subtracted twice. Red means more went out than came in. The current month is still in progress."
          >
            <ColumnChart
              title="Left over each month"
              data={netData}
              currency={currency}
              diverging
              labelKeys={netLabels}
              valueHeading="Left over"
            />
          </Panel>
        </div>

        <Panel title="Spending by category" subtitle={`Largest first, ${rangeLabel}. Smaller categories are grouped as “Other”.`}>
          <CategoryBars rows={ranked} />
        </Panel>
      </main>
    </div>
  );
}
