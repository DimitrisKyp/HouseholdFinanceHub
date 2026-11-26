// Market data for the dashboard, from public services that need no API key:
//   - news: an RSS feed (default: BBC News Business)
//   - exchange rates: ECB reference rates through the Frankfurter API
// Results are cached in memory (lib/cache.ts) for MARKET_CACHE_SECONDS (default 15 minutes);
// when a refresh fails, the last good copy is shown and marked stale.
import "server-only";
import { createCache } from "@/lib/cache";
import { daysBefore, parseHeadlines, RATE_SYMBOLS, ratesView, type FrankfurterRates } from "@/lib/market-data";

const NEWS_FEED_URL = process.env.NEWS_FEED_URL || "https://feeds.bbci.co.uk/news/business/rss.xml";
const RATES_API_URL = process.env.RATES_API_URL || "https://api.frankfurter.dev/v1";
const TTL_MS = Number(process.env.MARKET_CACHE_SECONDS ?? 900) * 1000;
const TIMEOUT_MS = 6_000;

export const NEWS_SOURCE = process.env.NEWS_SOURCE_NAME || "BBC News";

// Kept on globalThis so hot reloads in development don't empty it.
const globalForMarket = globalThis as typeof globalThis & { __marketCache?: ReturnType<typeof createCache> };
const cache = (globalForMarket.__marketCache ??= createCache());

async function fetchFrom(url: string) {
  // A plain, generic client name: no user or household details ever go to these services.
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "HouseholdHub/1.0" },
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response;
}

/** { data: [{ title, summary, link, publishedAt }], fetchedAt, stale } — throws if never loaded. */
export function getHeadlines() {
  return cache.get(`news:${NEWS_FEED_URL}`, async () => parseHeadlines(await (await fetchFrom(NEWS_FEED_URL)).text()), { ttlMs: TTL_MS });
}

/** { data: { base, date, rows: [{ code, rate, changePercent }] }, fetchedAt, stale } for one unit of `base`. */
export function getRates(base: string) {
  const symbols = RATE_SYMBOLS.filter(code => code !== base).join(",");
  return cache.get(
    `rates:${base}`,
    async () => {
      // response.json() is untyped (`any`): we state the shape the API documents.
      const latest: FrankfurterRates = await (await fetchFrom(`${RATES_API_URL}/latest?base=${base}&symbols=${symbols}`)).json();
      // The change over a week, against the reference rates from 7 days before the latest ones.
      const previous: FrankfurterRates = await (
        await fetchFrom(`${RATES_API_URL}/${daysBefore(latest.date, 7)}?base=${base}&symbols=${symbols}`)
      ).json();
      return ratesView(latest, previous);
    },
    { ttlMs: TTL_MS },
  );
}
