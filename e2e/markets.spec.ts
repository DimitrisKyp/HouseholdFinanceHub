import type { Page } from "@playwright/test";
import { MARKET_STUB_URL } from "./env.mts";
import { expect, test } from "./fixtures.ts";
import { resetHousehold, sql, type TestHousehold } from "./helpers/db.ts";

// The dashboard's Markets & news panel, against the stand-in services (e2e/market-stub.mts).
// The app caches their answers for 2 seconds in these tests (MARKET_CACHE_SECONDS).
const setStub = (mode: "ok" | "empty" | "fail") => fetch(`${MARKET_STUB_URL}/__mode/${mode}`, { method: "POST" });
const panel = (page: Page) => page.getByRole("heading", { name: "Markets & news" }).locator("xpath=ancestor::section[1]");
const waitForCacheToExpire = (page: Page) => page.waitForTimeout(2_500);

let household: TestHousehold;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  household = await resetHousehold();
  await setStub("ok");
});
test.afterAll(() => setStub("ok"));

test("shows exchange rates for the household currency and the latest headlines", async ({ page }) => {
  await page.goto("/");
  const market = panel(page);
  const rates = market.getByRole("table", { name: /Exchange rates for 1 EUR/ });
  await expect(rates.getByRole("row", { name: /USD/ })).toContainText("1.0989");
  // USD went from 1.1127 to 1.0989 over the week: −1.24%.
  await expect(rates.getByRole("row", { name: /USD/ })).toContainText("−1.24%");
  await expect(rates.getByRole("row", { name: /JPY/ })).toContainText("175.05");
  // The household's own currency isn't listed against itself.
  await expect(rates.getByRole("rowheader", { name: "EUR", exact: true })).toHaveCount(0);
  await expect(rates.getByRole("rowheader")).toHaveCount(4);

  const headlines = market.getByRole("list", { name: "Business headlines" });
  await expect(headlines.getByRole("link", { name: /Energy bills to rise in January/ })).toHaveAttribute(
    "href",
    "https://example.com/news/energy",
  );
  await expect(headlines).toContainText("Savings rates hold & mortgages ease");
  await expect(market.getByText(/^Updated \d\d:\d\d$/).first()).toBeVisible();
});

test("keeps showing the last good data, marked as not up to date, when a refresh fails", async ({ page }) => {
  await page.goto("/");
  await expect(panel(page)).toContainText("Energy bills to rise in January");
  await setStub("fail");
  await waitForCacheToExpire(page);
  await page.reload();
  await expect(panel(page)).toContainText("Energy bills to rise in January");
  await expect(panel(page)).toContainText("Couldn't refresh, showing headlines from");
  await expect(panel(page)).toContainText("Couldn't refresh, showing rates from");
  await setStub("ok");
});

test("says so when there's nothing to show", async ({ page }) => {
  await setStub("empty");
  await page.goto("/");
  await waitForCacheToExpire(page);
  await page.reload();
  await expect(panel(page)).toContainText("No headlines right now.");
  await setStub("ok");
});

test("a failure with nothing to fall back on offers a retry, and the rest of the page still works", async ({ page }) => {
  // Rates in CHF have never been loaded, so there's no earlier copy to show.
  await sql("UPDATE household SET currency = 'CHF' WHERE id = $1", [household.householdId]);
  await setStub("fail");
  await page.goto("/");
  const failed = panel(page).getByRole("alert").filter({ hasText: "Couldn't load exchange rates right now." });
  await expect(failed).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expense tracker" })).toBeVisible();

  await setStub("ok");
  await failed.getByRole("button", { name: "Try again" }).click();
  await expect(panel(page).getByRole("table", { name: /Exchange rates for 1 CHF/ })).toBeVisible();
});
