import Link from "next/link";
import CategoryBars from "@/components/Insights/CategoryBars";
import SavingsForecast from "@/components/Goals/SavingsForecast";
import ColumnChart from "@/components/Insights/LazyColumnChart";
import Panel from "@/components/Panel";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import {
  billsByCategory,
  listRecurringItems,
  monthlySpending,
  recurringTotals,
  spendingBeyondBills,
  spendingByCategory,
} from "@/lib/finance";
import { loadSavingsForecast } from "@/lib/forecast-data";
import { formatMoney, formatMonth, todayIn } from "@/lib/format";
import { INSIGHT_RANGES, monthlySeries, parseInsightRange, rangeMonths, topCategories } from "@/lib/insights";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("insights"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

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
function shortMonth(isoDate, isFirst, locale) {
  const [year, month] = isoDate.split("-").map(Number);
  const name = new Intl.DateTimeFormat(dateLocale(locale), { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return month === 1 || isFirst ? `${name} ${String(year).slice(2)}` : name;
}

export default async function InsightsPage({ searchParams }) {
  const { householdId, currency, timezone } = await requireHousehold();
  const [locale, t] = await Promise.all([getLocale(), getTranslations("insights")]);
  const money = amount => formatMoney(amount, currency, locale);
  const today = todayIn(timezone);
  const rangeKey = parseInsightRange((await searchParams)?.range);
  const { months, from, to } = rangeMonths(rangeKey, today);

  const [spending, categories, recurring, { forecast }] = await Promise.all([
    monthlySpending(householdId, { from, to }),
    spendingByCategory(householdId, { from, to }),
    listRecurringItems(householdId),
    loadSavingsForecast(householdId, { today, timezone, currency, locale }),
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
  const ranked = topCategories(categories, undefined, count => t("categories.other", { count })).map(row => ({
    ...row,
    totalLabel: money(row.total),
  }));

  const toPoint = (row, index, value) => ({
    key: row.month,
    label: shortMonth(row.month, index === 0, locale),
    fullLabel: formatMonth(row.month, locale),
    value,
    note: row.current ? t("monthInProgress") : null,
  });
  const spentData = series.map((row, index) => toPoint(row, index, row.spent));
  const netData = series.map((row, index) => toPoint(row, index, row.net));
  // Label selectively: the current month and the extreme; the axis, tooltip and table carry the rest.
  const labelKeys = (data, size) => [data.at(-1).key, data.reduce((best, item) => (size(item) > size(best) ? item : best)).key];
  const spentLabels = labelKeys(spentData, item => item.value);
  const netLabels = labelKeys(netData, item => Math.abs(item.value));
  const rangeLabel = t(`rangesInline.${rangeKey}`);
  const biggest = ranked[0] && ranked[0].id !== "other" ? ranked[0] : null;

  return (
    <Messages namespaces={["insights", "goals"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("intro")}</p>
              </div>
              <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                {t("backToDashboard")}
              </Link>
            </div>
          </section>

          {/* One filter row above everything it scopes. */}
          <nav aria-label={t("period")} className="flex flex-wrap gap-2">
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
                  {t(`ranges.${range.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("tiles.spent", { range: rangeLabel })}
              value={money(totalSpent)}
              detail={t("tiles.months", { count: months.length })}
            />
            <StatTile
              label={t("tiles.average")}
              value={average === null ? "—" : money(Math.round(average))}
              detail={average === null ? t("tiles.noCompleted") : t("tiles.completedOnly")}
            />
            <StatTile
              label={t("tiles.thisMonth")}
              value={money(current.spent)}
              detail={previous ? t("tiles.lastMonth", { amount: money(previous.spent) }) : null}
            />
            <StatTile
              label={t("tiles.biggest")}
              value={biggest ? biggest.name : "—"}
              detail={biggest ? t("tiles.share", { amount: biggest.totalLabel, share: biggest.share }) : t("tiles.noSpending")}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={t("spending.title")} subtitle={t("spending.subtitle")}>
              <ColumnChart
                title={t("spending.title")}
                data={spentData}
                currency={currency}
                labelKeys={spentLabels}
                valueHeading={t("spending.valueHeading")}
                reference={
                  totals.income > 0 ? { value: totals.income, label: t("spending.income", { amount: money(totals.income) }) } : null
                }
              />
            </Panel>
            <Panel title={t("leftOver.title")} subtitle={t("leftOver.subtitle")}>
              <ColumnChart
                title={t("leftOver.title")}
                data={netData}
                currency={currency}
                diverging
                labelKeys={netLabels}
                valueHeading={t("leftOver.valueHeading")}
              />
            </Panel>
          </div>

          <Panel title={t("categories.title")} subtitle={t("categories.subtitle", { range: rangeLabel })}>
            <CategoryBars rows={ranked} />
          </Panel>

          <Panel title={t("forecast.title")} subtitle={t("forecast.subtitle")}>
            <SavingsForecast forecast={forecast} />
          </Panel>
        </main>
      </div>
    </Messages>
  );
}
