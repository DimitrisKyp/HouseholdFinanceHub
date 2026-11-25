import { expect, test } from "./fixtures.mjs";
import { resetHousehold } from "./helpers/db.mjs";

// Performance budget: the JavaScript each page downloads on a first visit (compressed, as sent over
// the network), measured in the browser from the Resource Timing API. Printed as a table and
// attached to the report; the test fails if a page goes over its budget.
const BUDGET_KB = 200;
const PAGES = ["/", "/budget", "/transactions", "/insights", "/goals", "/members", "/account"];

test.beforeAll(async () => {
  await resetHousehold();
});

test("first-load JavaScript per page stays within budget", async ({ browser }, testInfo) => {
  const rows = [];
  for (const path of PAGES) {
    // A fresh context per page: nothing cached from the previous one.
    const context = await browser.newContext({ storageState: "e2e/.auth/owner.json" });
    const page = await context.newPage();
    await page.goto(path, { waitUntil: "networkidle" });
    const bytes = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter(entry => entry.initiatorType === "script" || entry.name.endsWith(".js"))
        .reduce((sum, entry) => sum + (entry.encodedBodySize || entry.transferSize || 0), 0),
    );
    rows.push({ path, kb: Math.round(bytes / 1024) });
    await context.close();
  }

  const table = rows.map(row => `${row.path.padEnd(16)} ${String(row.kb).padStart(5)} KB`).join("\n");
  console.log(`First-load JavaScript (compressed):\n${table}`);
  await testInfo.attach("first-load-js.txt", { body: table, contentType: "text/plain" });
  for (const row of rows) expect.soft(row.kb, `${row.path} is over the ${BUDGET_KB} KB budget`).toBeLessThanOrEqual(BUDGET_KB);
});
