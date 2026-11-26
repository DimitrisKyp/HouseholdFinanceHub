// Stand-in for the news feed and the exchange-rate API during browser tests, so the tests never
// depend on the internet. `POST /__mode/<ok|empty|fail>` switches how it answers.
import http from "node:http";
import { MARKET_STUB_PORT } from "./env.mjs";

let mode = "ok";

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Stub</title>
<item><title><![CDATA[Energy bills to rise in January]]></title><description><![CDATA[Typical household bills go up.]]></description>
<link>https://example.com/news/energy</link><pubDate>Wed, 18 Nov 2026 13:17:06 GMT</pubDate></item>
<item><title>Savings rates hold &amp; mortgages ease</title><description>Lenders trim fixed rates.</description>
<link>https://example.com/news/rates</link><pubDate>Wed, 18 Nov 2026 11:00:00 GMT</pubDate></item>
</channel></rss>`;
const EMPTY_FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Stub</title></channel></rss>`;

// One unit of the base currency, as the Frankfurter API answers.
const LATEST = { EUR: 1, USD: 1.0989, GBP: 0.83305, CHF: 0.9233, JPY: 175.05 };
const WEEK_AGO = { EUR: 1, USD: 1.1127, GBP: 0.83618, CHF: 0.9233, JPY: 172.4 };

function rates(table, base, symbols, date) {
  const per = table[base];
  return {
    amount: 1,
    base,
    date,
    rates: Object.fromEntries(symbols.filter(code => table[code]).map(code => [code, Math.round((table[code] / per) * 1e5) / 1e5])),
  };
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://stub");
  const send = (status, type, body) => {
    response.writeHead(status, { "Content-Type": type });
    response.end(body);
  };

  const switchTo = /^\/__mode\/(ok|empty|fail)$/.exec(url.pathname);
  if (request.method === "POST" && switchTo) {
    mode = switchTo[1];
    return send(200, "text/plain", mode);
  }
  if (url.pathname === "/health") return send(200, "text/plain", "ok");
  if (mode === "fail") return send(503, "text/plain", "unavailable");

  if (url.pathname === "/news.xml") return send(200, "application/rss+xml", mode === "empty" ? EMPTY_FEED : FEED);
  const ratesPath = /^\/rates\/(latest|\d{4}-\d{2}-\d{2})$/.exec(url.pathname);
  if (ratesPath) {
    const base = url.searchParams.get("base");
    if (!LATEST[base]) return send(404, "application/json", JSON.stringify({ message: "not found" }));
    const symbols = (url.searchParams.get("symbols") ?? "").split(",");
    const body = ratesPath[1] === "latest" ? rates(LATEST, base, symbols, "2026-11-17") : rates(WEEK_AGO, base, symbols, ratesPath[1]);
    return send(200, "application/json", JSON.stringify(body));
  }
  send(404, "text/plain", "not found");
});

server.listen(MARKET_STUB_PORT, () => console.log(`market stub on ${MARKET_STUB_PORT}`));
