import { expect, test } from "./fixtures.mjs";
import { formatMonth, monthStart, parts, shortMonthWithYear, today } from "./helpers/dates.mjs";
import { resetHousehold, sql } from "./helpers/db.mjs";

// Spending per month, oldest first, ending with the current month (12 months ago .. now).
const SPENDING = [900, 2400, 1500, 1300, 1700, 1200, 1600, 2600, 1400, 1800, 1500, 1750, 640];
const month = offset => monthStart(today(), offset);

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  // Income €3,000 and bills €1,000 a month; each month's spending is 70% groceries, 30% transport.
  const { householdId, categoryIds } = await resetHousehold();
  await sql(`INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'income', 'Salary', 3000, $2)`, [
    householdId,
    today(),
  ]);
  await sql(`INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'expense', 'Rent', 1000, $2)`, [
    householdId,
    today(),
  ]);
  for (const [index, total] of SPENDING.entries()) {
    const day = month(index - (SPENDING.length - 1)); // the 1st, so the current month's are never in the future
    await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Food', $3, $4)", [
      householdId,
      categoryIds.Groceries,
      total * 0.7,
      day,
    ]);
    await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Bus', $3, $4)", [
      householdId,
      categoryIds.Transport,
      total * 0.3,
      day,
    ]);
  }
});

const spentChart = page => page.locator("figure").first();
const netChart = page => page.locator("figure").nth(1);
const columns = chart => chart.locator("rect[role=button]");

test("summarises the last 6 months", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Insights" }).click();
  await expect(page.getByText("Where the money goes.")).toBeVisible();

  const main = page.locator("main");
  // Last 6 months: 2600 + 1400 + 1800 + 1500 + 1750 + 640 = 9,690. Average of the 5 finished months: 1,810.
  await expect(main).toContainText("€9,690");
  await expect(main).toContainText("€1,810");
  await expect(main).toContainText("€640");
  await expect(main).toContainText("€1,750 last month");
  await expect(main).toContainText("Groceries");
  await expect(main).toContainText("70% of spending");
  await expect(main).toContainText("Income €3,000");
  await expect(columns(spentChart(page))).toHaveCount(6);
  // Only the €2,600 month went over: 3000 − 1000 − 2600 = −600, drawn red.
  await expect(netChart(page).locator('path[fill="#e66767"]')).toHaveCount(1);
});

test("charts have hover and keyboard tooltips and a table view", async ({ page }) => {
  await page.goto("/insights");

  await columns(spentChart(page)).first().hover();
  await expect(page.getByRole("tooltip")).toContainText("€2,600");
  await expect(page.getByRole("tooltip")).toContainText(formatMonth(month(-5)));

  await page.mouse.move(5, 5);
  const current = columns(netChart(page)).last();
  await current.focus();
  await expect(page.getByRole("tooltip")).toContainText("month in progress");
  await expect(current).toHaveAttribute("aria-label", new RegExp(`^${formatMonth(month(0))}: €1,360`));

  await page.getByText("Show as table").first().click();
  await expect(spentChart(page).locator("table")).toContainText(`${formatMonth(month(-5))}€2,600`);
});

test("switches between ranges", async ({ page }) => {
  await page.goto("/insights");
  await page.getByRole("link", { name: "Last 12 months" }).click();
  await page.waitForURL(/range=12m/);
  await expect(page.getByText("Spent, last 12 months")).toBeVisible();
  await expect(columns(spentChart(page))).toHaveCount(12);
  await expect(spentChart(page)).toContainText(shortMonthWithYear(month(-11))); // the first label carries the year

  await page.getByRole("link", { name: "This year" }).click();
  await page.waitForURL(/range=ytd/);
  await expect(page.getByText("Spent, this year")).toBeVisible();
  await expect(columns(spentChart(page))).toHaveCount(parts(today())[1]);
  await expect(page.getByRole("link", { name: /This year/ })).toHaveAttribute("aria-current", "true");
});

test("fits a phone screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/insights");
  await expect(page.getByText("Where the money goes.")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scroller = document.querySelector("main").parentElement;
        return scroller.scrollWidth - scroller.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(0);
});
