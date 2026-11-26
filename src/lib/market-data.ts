// Parsing for the market data on the dashboard: an RSS news feed and ECB reference exchange rates
// (Frankfurter API). Pure functions on the raw responses, so they're easy to unit-test.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
const decode = (text: string) =>
  text
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
      if (name[0] === "#") {
        const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[name.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();

/** The text inside <tag>…</tag> (CDATA or plain), decoded, or "". */
function tag(xml: string, name: string) {
  const match = new RegExp(String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`, "i").exec(xml);
  if (!match) return "";
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(match[1]);
  // Feeds sometimes put HTML in descriptions: keep the text only.
  return decode((cdata ? cdata[1] : match[1]).replace(/<[^>]+>/g, " "));
}

/**
 * The newest headlines from an RSS 2.0 feed: [{ title, summary, link, publishedAt (ISO) | null }].
 * Items without a title or a safe http(s) link are skipped.
 */
export type Headline = { title: string; summary: string; link: string; publishedAt: string | null };

export function parseHeadlines(xml: unknown, limit = 5): Headline[] {
  const items: Headline[] = [];
  for (const [, item] of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const title = tag(item, "title");
    const link = tag(item, "link");
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const published = Date.parse(tag(item, "pubDate"));
    items.push({
      title,
      summary: tag(item, "description"),
      link,
      publishedAt: Number.isNaN(published) ? null : new Date(published).toISOString(),
    });
    if (items.length >= limit) break;
  }
  return items;
}

/** Currencies shown against the household's own (it's left out of its own list). */
export const RATE_SYMBOLS = ["EUR", "USD", "GBP", "CHF", "JPY"];

/**
 * Rates for one unit of `base`, with the change since an earlier day:
 * [{ code, rate, changePercent | null }], plus the date the rates are from.
 */
/** The Frankfurter API's answer: rates for one unit of `base` on `date`. */
export type FrankfurterRates = { base: string; date: string; rates: Record<string, number> };

export function ratesView(latest: Partial<FrankfurterRates> | null | undefined, previous: Partial<FrankfurterRates> | null | undefined) {
  const rows = Object.entries(latest?.rates ?? {}).map(([code, rate]) => {
    const before = previous?.rates?.[code];
    const changePercent = typeof before === "number" && before > 0 ? Math.round(((rate - before) / before) * 10000) / 100 : null;
    return { code, rate, changePercent };
  });
  rows.sort((a, b) => RATE_SYMBOLS.indexOf(a.code) - RATE_SYMBOLS.indexOf(b.code));
  return { base: latest?.base ?? null, date: latest?.date ?? null, rows };
}

/** "2026-11-11" for "2026-11-18" and 7. */
export function daysBefore(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}
