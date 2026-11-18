// Markets & news on the dashboard: exchange rates against the household currency and the latest
// business headlines. An async Server Component, streamed in a Suspense boundary (see
// MarketPanelSkeleton), so a slow or failing service never holds up the rest of the dashboard.
// Each half has its own states: loaded, empty, failed (with "Try again"), and stale.
import RetryButton from "@/components/Feedback/RetryButton";
import Panel from "@/components/Panel";
import Badge from "@/components/ui/Badge";
import { getHeadlines, getRates, NEWS_SOURCE } from "@/lib/market";

function timeLabel(date, timezone) {
  const sameDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    ...(sameDay(date) === sameDay(new Date()) ? {} : { day: "numeric", month: "short" }),
  };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

/** "Updated 14:05", or a warning that the data couldn't be refreshed. */
function Freshness({ result, what, timezone }) {
  const when = timeLabel(result.fetchedAt, timezone);
  if (!result.stale) return <p className="text-xs text-slate-500">Updated {when}</p>;
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
      <Badge tone="warning">Not up to date</Badge>
      Couldn&apos;t refresh, showing {what} from {when}.
    </p>
  );
}

function Failed({ what }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm">
      <p className="text-rose-200">Couldn&apos;t load {what} right now.</p>
      <p className="mt-1 text-xs text-slate-400">The service may be busy or unreachable. Everything else works as normal.</p>
      <div className="mt-3">
        <RetryButton />
      </div>
    </div>
  );
}

const rateFormat = rate =>
  new Intl.NumberFormat("en-IE", { minimumFractionDigits: rate >= 100 ? 2 : 4, maximumFractionDigits: rate >= 100 ? 2 : 4 }).format(rate);

function Rates({ result, currency, timezone }) {
  const { rows, date } = result.data;
  if (!rows.length) return <p className="text-sm text-slate-400">No exchange rates are published for {currency}.</p>;
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <caption className="sr-only">Exchange rates for 1 {currency}, and the change over a week</caption>
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th scope="col" className="pb-1 font-normal">
              1 {currency} =
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Rate
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Week
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.code} className="border-line border-t">
              <th scope="row" className="py-1.5 text-left font-medium text-white">
                {row.code}
              </th>
              <td className="py-1.5 text-right text-slate-200 tabular-nums">{rateFormat(row.rate)}</td>
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
      <p className="text-xs text-slate-500">ECB reference rates{date ? ` for ${date}` : ""}.</p>
      <Freshness result={result} what="rates" timezone={timezone} />
    </div>
  );
}

function Headlines({ result, timezone }) {
  if (!result.data.length) return <p className="text-sm text-slate-400">No headlines right now. Check back later.</p>;
  return (
    <div className="space-y-2">
      <ul aria-label="Business headlines" className="space-y-3">
        {result.data.map(item => (
          <li key={item.link}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="group block rounded-lg outline-offset-4">
              <span className="font-medium text-white group-hover:text-cyan-300 group-hover:underline">{item.title}</span>
              <span className="sr-only"> (opens {NEWS_SOURCE} in a new tab)</span>
            </a>
            {item.summary ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">{item.summary}</p> : null}
          </li>
        ))}
      </ul>
      <Freshness result={result} what="headlines" timezone={timezone} />
    </div>
  );
}

export default async function MarketPanel({ currency, timezone }) {
  const [rates, news] = await Promise.allSettled([getRates(currency), getHeadlines()]);
  for (const result of [rates, news]) if (result.status === "rejected") console.error("Market data failed", result.reason);

  return (
    <Panel title="Markets & news" subtitle={`Exchange rates for ${currency} and the latest business headlines from ${NEWS_SOURCE}.`}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="rates-heading">
          <h3 id="rates-heading" className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            Exchange rates
          </h3>
          {rates.status === "fulfilled" ? (
            <Rates result={rates.value} currency={currency} timezone={timezone} />
          ) : (
            <Failed what="exchange rates" />
          )}
        </section>
        <section aria-labelledby="news-heading">
          <h3 id="news-heading" className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            Headlines
          </h3>
          {news.status === "fulfilled" ? <Headlines result={news.value} timezone={timezone} /> : <Failed what="headlines" />}
        </section>
      </div>
    </Panel>
  );
}
