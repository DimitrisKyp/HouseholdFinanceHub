import type { Page } from "@playwright/test";
import { authFile, expect, test } from "./fixtures.ts";
import { dateMonthsAhead, formatMonth, monthStart, parts, today } from "./helpers/dates.ts";
import { resetHousehold, sql, type TestHousehold } from "./helpers/db.ts";

const month = (offset: number) => monthStart(today(), offset);
const card = (page: Page, name: string) => page.locator("article", { has: page.getByRole("heading", { name, exact: true }) });
// The panel is the nearest section around its heading.
const forecastPanel = (page: Page) => page.getByRole("heading", { name: "Savings forecast" }).locator("xpath=ancestor::section[1]");

let household: TestHousehold;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  household = await resetHousehold();
});

test("explains what's missing before there's anything to forecast", async ({ page }) => {
  await page.goto("/goals");
  await expect(forecastPanel(page)).toContainText("Add your income on the Finances page and your bills on the Spending page");
  await expect(forecastPanel(page).getByRole("link", { name: "Finances page" })).toHaveAttribute("href", "/budget");
});

test.describe("with a budget, spending history and goals", () => {
  // Monthly targets for "Car" are relative to when the target month is (see dateMonthsAhead).
  const target = dateMonthsAhead(10);
  const targetMonthOffset = parts(today())[2] <= 28 ? 10 : 11;

  test.beforeAll(async () => {
    const { householdId, categoryIds } = household;
    // Income €3,000, bills €1,000 (rent, in Housing); the last 3 full months spent €1,500, €1,200, €1,800
    // on shopping (typical €1,500), plus the rent, logged as an expense too: it mustn't count twice.
    await sql(`INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'income', 'Salary', 3000, $2)`, [
      householdId,
      today(),
    ]);
    await sql(
      `INSERT INTO recurring_item (household_id, type, title, amount, category_id, starts_on) VALUES ($1, 'expense', 'Rent', 1000, $2, $3)`,
      [householdId, categoryIds.Housing, today()],
    );
    for (const [offset, amount] of [
      [-3, 1500],
      [-2, 1200],
      [-1, 1800],
      [0, 400], // this month, still in progress: not part of the average
    ]) {
      await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Shopping', $3, $4)", [
        householdId,
        categoryIds.Groceries,
        amount,
        month(offset),
      ]);
    }
    for (const offset of [-3, -2, -1]) {
      await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Rent', 1000, $3)", [
        householdId,
        categoryIds.Housing,
        month(offset),
      ]);
    }

    // "Car": €5,000, created 5 months ago with €1,000 already saved, then €200 in each of the last
    // 3 full months: saved €1,600, pace €200 a month, €3,400 to go → 17 months.
    const car = await sql(
      `INSERT INTO goal (household_id, name, target_amount, target_date, created_at) VALUES ($1, 'Car', 5000, $2, $3::date + time '12:00') RETURNING id`,
      [householdId, target, month(-5)],
    );
    for (const [offset, amount] of [
      [-5, 1000],
      [-3, 200],
      [-2, 200],
      [-1, 200],
    ]) {
      await sql("INSERT INTO goal_contribution (goal_id, amount, contributed_on) VALUES ($1, $2, $3)", [
        car.rows[0].id,
        amount,
        month(offset),
      ]);
    }
    // "Trip": created this month, so there's no pace yet.
    const trip = await sql(`INSERT INTO goal (household_id, name, target_amount) VALUES ($1, 'Trip', 900) RETURNING id`, [householdId]);
    await sql("INSERT INTO goal_contribution (goal_id, amount, contributed_on) VALUES ($1, 300, $2)", [trip.rows[0].id, today()]);
  });

  test("forecasts the monthly left-over and compares it with what goals need", async ({ page }) => {
    await page.goto("/goals");
    const panel = forecastPanel(page);
    // 3000 − 1000 − 1500 = 500 a month.
    await expect(panel.getByRole("article").filter({ hasText: "Left over each month" })).toContainText("€500");
    // The goals at their recent pace: Car €1,600 + €200 a month, Trip (no pace yet) stays at €300.
    const sixMonths = panel.getByRole("article").filter({ hasText: "In 6 months" });
    await expect(sixMonths).toContainText("€3,100"); // 1,600 + 1,200 + 300
    await expect(sixMonths).toContainText("recent pace of €200 a month. Saving all that's left over would add €3,000.");
    await expect(panel.getByRole("article").filter({ hasText: "In 12 months" })).toContainText("€4,300"); // 1,600 + 2,400 + 300
    // Car needs €3,400 over 10 months = €340; 500 − 340 = 160 spare.
    const goalsTile = panel.getByRole("article").filter({ hasText: "Your goals need" });
    await expect(goalsTile).toContainText("€340 / month");
    await expect(goalsTile).toContainText("Covered, with €160 a month to spare");
    await expect(panel).toContainText("Income €3,000 − fixed bills €1,000 − typical spending €1,500 = €500 a month.");
    await expect(panel).toContainText("average of the last 3 full months");
  });

  test("projects each goal at its recent pace", async ({ page }) => {
    await page.goto("/goals");
    const monthsLate = 17 - targetMonthOffset;
    await expect(card(page, "Car")).toContainText(
      `At your recent pace (about €200 a month) you'd reach it in ${formatMonth(month(17))}, ${monthsLate} months after the target date.`,
    );
    await expect(card(page, "Trip")).toContainText("A projected date appears after its first full month.");
  });

  test("updates when the budget changes", async ({ page }) => {
    // A bigger salary: 3,600 − 1,000 − 1,500 = 1,100 a month.
    await sql("UPDATE recurring_item SET amount = 3600 WHERE household_id = $1 AND type = 'income'", [household.householdId]);
    await page.goto("/goals");
    await expect(forecastPanel(page).getByRole("article").filter({ hasText: "Left over each month" })).toContainText("€1,100");
  });

  test("also appears on Insights, whatever the period", async ({ page }) => {
    await page.goto("/insights?range=12m");
    const panel = forecastPanel(page);
    await expect(panel).toContainText("whatever period is chosen above");
    await expect(panel.getByRole("article").filter({ hasText: "Left over each month" })).toContainText("€1,100");
  });

  test.describe("viewer", () => {
    test.use({ storageState: authFile("viewer") });

    test("sees the forecast too", async ({ page }) => {
      await page.goto("/goals");
      await expect(forecastPanel(page)).toContainText("€1,100");
      await expect(card(page, "Car")).toContainText("At your recent pace");
    });
  });
});
