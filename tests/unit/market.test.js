import { describe, expect, it, vi } from "vitest";
import { createCache } from "@/lib/cache";
import { daysBefore, parseHeadlines, ratesView } from "@/lib/market-data";

describe("parseHeadlines", () => {
  const feed = `<rss><channel>
    <item><title><![CDATA[Bills <b>rise</b> again]]></title><description><![CDATA[<p>Typical &amp; average</p>]]></description>
      <link>https://example.com/a?x=1&amp;y=2</link><pubDate>Wed, 18 Nov 2026 13:17:06 GMT</pubDate></item>
    <item><title>No link</title></item>
    <item><title>Bad link</title><link>javascript:alert(1)</link></item>
    <item><title>Rates &#8211; steady</title><link>http://example.com/b</link><pubDate>not a date</pubDate></item>
  </channel></rss>`;

  it("reads title, summary, link and date, decoding entities and dropping HTML", () => {
    expect(parseHeadlines(feed)).toEqual([
      {
        title: "Bills rise again",
        summary: "Typical & average",
        link: "https://example.com/a?x=1&y=2",
        publishedAt: "2026-11-18T13:17:06.000Z",
      },
      { title: "Rates – steady", summary: "", link: "http://example.com/b", publishedAt: null },
    ]);
  });

  it("skips items without a safe link, and stops at the limit", () => {
    expect(parseHeadlines(feed, 1)).toHaveLength(1);
    expect(parseHeadlines("not xml")).toEqual([]);
  });
});

describe("ratesView", () => {
  it("lists rates in a fixed order with the change since the earlier day", () => {
    const view = ratesView(
      { base: "EUR", date: "2026-11-17", rates: { JPY: 175.05, USD: 1.0989, GBP: 0.83305 } },
      { rates: { USD: 1.1127, GBP: 0.83305 } },
    );
    expect(view).toEqual({
      base: "EUR",
      date: "2026-11-17",
      rows: [
        { code: "USD", rate: 1.0989, changePercent: -1.24 },
        { code: "GBP", rate: 0.83305, changePercent: 0 },
        { code: "JPY", rate: 175.05, changePercent: null },
      ],
    });
  });

  it("counts back calendar days across month ends", () => {
    expect(daysBefore("2026-12-03", 7)).toBe("2026-11-26");
  });
});

describe("cache", () => {
  const setup = () => {
    let time = 0;
    const cache = createCache({ now: () => time });
    return { cache, advance: ms => (time += ms) };
  };

  it("serves a fresh copy until it expires, then loads again", async () => {
    const { cache, advance } = setup();
    const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    expect((await cache.get("k", loader, { ttlMs: 1000 })).data).toBe("first");
    advance(500);
    expect((await cache.get("k", loader, { ttlMs: 1000 })).data).toBe("first");
    advance(600);
    expect(await cache.get("k", loader, { ttlMs: 1000 })).toMatchObject({ data: "second", stale: false });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("falls back to the last good copy, marked stale, when loading fails", async () => {
    const { cache, advance } = setup();
    await cache.get("k", async () => "good", { ttlMs: 1000 });
    advance(5000);
    const result = await cache.get("k", async () => Promise.reject(new Error("down")), { ttlMs: 1000 });
    expect(result).toMatchObject({ data: "good", stale: true });
    expect(result.fetchedAt).toEqual(new Date(0));
  });

  it("passes the error on when there's nothing to fall back on", async () => {
    const { cache } = setup();
    await expect(cache.get("k", async () => Promise.reject(new Error("down")), { ttlMs: 1000 })).rejects.toThrow("down");
  });

  it("shares one load between requests made at the same time", async () => {
    const { cache } = setup();
    const loader = vi.fn(async () => "once");
    const results = await Promise.all([1, 2, 3].map(() => cache.get("k", loader, { ttlMs: 1000 })));
    expect(results.map(r => r.data)).toEqual(["once", "once", "once"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
