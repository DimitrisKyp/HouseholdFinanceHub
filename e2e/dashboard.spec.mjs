import { acceptNextDialog, authFile, expect, test } from "./fixtures.mjs";
import { dayOf, monthStart, today } from "./helpers/dates.mjs";
import { resetHousehold, sql } from "./helpers/db.mjs";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  // Salary €3,000 and rent €1,000 a month, a goal with €250 saved, and an expense from last month.
  const { householdId, categoryIds } = await resetHousehold();
  await sql(`INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'income', 'Salary', 3000, $2)`, [
    householdId,
    today(),
  ]);
  await sql(
    `INSERT INTO recurring_item (household_id, type, title, amount, category_id, starts_on) VALUES ($1, 'expense', 'Rent', 1000, $2, $3)`,
    [householdId, categoryIds.Housing, today()],
  );
  const goal = await sql(`INSERT INTO goal (household_id, name, target_amount) VALUES ($1, 'Holiday', 1000) RETURNING id`, [householdId]);
  await sql(`INSERT INTO goal_contribution (goal_id, amount, contributed_on) VALUES ($1, 250, $2)`, [goal.rows[0].id, today()]);
  await sql(`INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Old groceries', 999, $3)`, [
    householdId,
    categoryIds.Groceries,
    dayOf(monthStart(today(), -1), 28),
  ]);
});

test("shows this month's budget, ignoring last month's expenses", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  await expect(main).toContainText("€3,000");
  await expect(main).toContainText("€2,000"); // left: 3000 − 1000, last month's €999 not counted
  await expect(main).toContainText("€250 / €1,000 · 25%");
});

test("owner adds expenses, with validation", async ({ page }) => {
  await page.goto("/");

  await page.fill("#expense-date", "2099-01-01");
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText("What was it for?")).toBeVisible();
  await expect(page.getByText("Choose a category.")).toBeVisible();
  await expect(page.getByText("The date can't be in the future.")).toBeVisible();

  await page.fill("#expense-title", "Supermarket");
  await page.fill("#expense-amount", "120.40");
  await page.fill("#expense-date", "");
  await page.selectOption("#expense-category", { label: "Groceries" });
  await expect(page.locator("#expense-payer option:checked")).toHaveText("Test Owner");
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText("Supermarket (€120.40) added.")).toBeVisible();
  await expect(page.locator("#expense-category option:checked")).toHaveText("Groceries");

  await page.fill("#expense-title", "Big shop");
  await page.fill("#expense-amount", "560");
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText("Big shop (€560) added.")).toBeVisible();
  await page.fill("#expense-title", "Bus pass");
  await page.fill("#expense-amount", "30");
  await page.selectOption("#expense-category", { label: "Transport" });
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText("Bus pass (€30) added.")).toBeVisible();

  // Spent 710.40; left 3000 − 1000 − 710.40 = 1289.60; savings rate 43%.
  const main = page.locator("main");
  await expect(main).toContainText("€710.40");
  await expect(main).toContainText("€1,289.60");
  await expect(main).toContainText("43%");
});

test("breakdown drawer shows categories against limits and deletes expenses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /View budget breakdown/ }).click();
  const drawer = page.getByRole("dialog", { name: "Budget breakdown" });
  await expect(drawer.getByText("Transactions (3)")).toBeVisible();
  await expect(drawer).toContainText("€680.40 / €650"); // over the limit
  await expect(drawer).toContainText("€30 · no limit");
  await expect(drawer).toContainText("€0 / €380");
  await expect(drawer).not.toContainText("Old groceries");

  acceptNextDialog(page);
  await drawer.getByRole("button", { name: "Delete Big shop" }).click();
  await expect(drawer.getByText("Transactions (2)")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveClass(/translate-x-full/);
  await expect(page.locator("main")).toContainText("€150.40");
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees totals and the breakdown but can't add or delete", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toContainText("€150.40");
    await expect(page.locator("#expense-title")).toHaveCount(0);
    await page.getByRole("button", { name: /View budget breakdown/ }).click();
    const drawer = page.getByRole("dialog", { name: "Budget breakdown" });
    await expect(drawer.getByText("Transactions (2)")).toBeVisible();
    await expect(drawer.getByRole("button", { name: /^Delete/ })).toHaveCount(0);
  });
});

test.describe("editor", () => {
  test.use({ storageState: authFile("editor") });

  test("can add an expense, paid by themselves by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#expense-payer option:checked")).toHaveText("Test Editor");
    await page.fill("#expense-title", "Coffee beans");
    await page.fill("#expense-amount", "12.60");
    await page.selectOption("#expense-category", { label: "Groceries" });
    await page.click('button:has-text("Add expense")');
    await expect(page.getByText("Coffee beans (€12.60) added.")).toBeVisible();
    await expect(page.locator("main")).toContainText("€163");
  });
});
