// Markets & news on the dashboard: exchange rates against the household currency and the latest
// business headlines. An async Server Component, streamed in a Suspense boundary (see
// MarketPanelSkeleton), so a slow or failing service never holds up the rest of the dashboard.
// Each half has its own states: loaded, empty, failed (with "Try again"), and stale.
import RetryButton from "@/components/Feedback/RetryButton";
import Panel from "@/components/Panel";
import Badge from "@/components/ui/Badge";
import { dateLocale, numberLocale } from "@/i18n/config";
import { getLocale, getTranslations } from "@/i18n/server";
import { getHeadlines, getRates, NEWS_SOURCE } from "@/lib/market";

function timeLabel(date, timezone, locale) {
  const sameDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    ...(sameDay(date) === sameDay(new Date()) ? {} : { day: "numeric", month: "short" }),
  };
  return new Intl.DateTimeFormat(dateLocale(locale), options).format(date);
}

/** "Updated 14:05", or a warning that the data couldn't be refreshed. */
function Freshness({ result, staleKey, timezone, t, locale }) {
  const when = timeLabel(result.fetchedAt, timezone, locale);
  if (!result.stale) return <p className="text-xs text-slate-500">{t("market.updated", { time: when })}</p>;
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
      <Badge tone="warning">{t("market.notUpToDate")}</Badge>
      {t(staleKey, { time: when })}
    </p>
  );
}

function Failed({ messageKey, t }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm">
      <p className="text-rose-200">{t(messageKey)}</p>
      <p className="mt-1 text-xs text-slate-400">{t("market.failedHint")}</p>
      <div className="mt-3">
        <RetryButton />
      </div>
    </div>
  );
}

const rateFormat = (rate, locale) =>
  new Intl.NumberFormat(numberLocale(locale), {
    minimumFractionDigits: rate >= 100 ? 2 : 4,
    maximumFractionDigits: rate >= 100 ? 2 : 4,
  }).format(rate);

function Rates({ result, currency, timezone, t, locale }) {
  const { rows, date } = result.data;
  if (!rows.length) return <p className="text-sm text-slate-400">{t("market.noRates", { currency })}</p>;
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <caption className="sr-only">{t("market.ratesCaption", { currency })}</caption>
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th scope="col" className="pb-1 font-normal">
              1 {currency} =
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              {t("market.rateColumn")}
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              {t("market.weekColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.code} className="border-line border-t">
              <th scope="row" className="py-1.5 text-left font-medium text-white">
                {row.code}
              </th>
              <td className="py-1.5 text-right text-slate-200 tabular-nums">{rateFormat(row.rate, locale)}</td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  row.changePercent > 0 ? "text-emerald-300" : row.changePercent < 0 ? "text-rose-300" : "text-slate-400"
                }`}
              >
                {row.changePercent === null
                  ? "—"
                  : `${row.changePercent > 0 ? "+" : row.changePercent < 0 ? "−" : ""}${Math.abs(row.changePercent).toFixed(2)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500">{date ? t("market.ecbRatesFor", { date }) : t("market.ecbRates")}</p>
      <Freshness result={result} staleKey="market.staleRates" timezone={timezone} t={t} locale={locale} />
    </div>
  );
}

function Headlines({ result, timezone, t, locale }) {
  if (!result.data.length) return <p className="text-sm text-slate-400">{t("market.noHeadlines")}</p>;
  return (
    <div className="space-y-2">
      <ul aria-label={t("market.headlinesLabel")} className="space-y-3">
        {result.data.map(item => (
          <li key={item.link}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="group block rounded-lg outline-offset-4">
              <span className="font-medium text-white group-hover:text-cyan-300 group-hover:underline">{item.title}</span>
              <span className="sr-only">{t("market.opensInNewTab", { source: NEWS_SOURCE })}</span>
            </a>
            {item.summary ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">{item.summary}</p> : null}
          </li>
        ))}
      </ul>
      <Freshness result={result} staleKey="market.staleHeadlines" timezone={timezone} t={t} locale={locale} />
    </div>
  );
}

export default async function MarketPanel({ currency, timezone }) {
  const [[rates, news], t, locale] = await Promise.all([
    Promise.allSettled([getRates(currency), getHeadlines()]),
    getTranslations("dashboard"),
    getLocale(),
  ]);
  for (const result of [rates, news]) if (result.status === "rejected") console.error("Market data failed", result.reason);

  return (
    <Panel
      title={t("market.title")}
      subtitle={t("market.subtitle", { currency, source: NEWS_SOURCE })}
      className="flex flex-col lg:min-h-0 lg:flex-1"
      contentClassName="relative min-h-0 flex-1 overflow-y-auto"
    >
      {/* Side by side when there's room; stacked in the dashboard's narrower right column on lg-xl. */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-cols-1 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="rates-heading">
          <h3 id="rates-heading" className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            {t("market.ratesHeading")}
          </h3>
          {rates.status === "fulfilled" ? (
            <Rates result={rates.value} currency={currency} timezone={timezone} t={t} locale={locale} />
          ) : (
            <Failed messageKey="market.failedRates" t={t} />
          )}
        </section>
        <section aria-labelledby="news-heading">
          <h3 id="news-heading" className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            {t("market.headlinesHeading")}
          </h3>
          {news.status === "fulfilled" ? (
            <Headlines result={news.value} timezone={timezone} t={t} locale={locale} />
          ) : (
            <Failed messageKey="market.failedHeadlines" t={t} />
          )}
        </section>
      </div>
    </Panel>
  );
}
