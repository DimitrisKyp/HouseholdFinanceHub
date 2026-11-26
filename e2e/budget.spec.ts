import type { Page } from "@playwright/test";
import { acceptNextDialog, authFile, expect, test } from "./fixtures.ts";
import { resetHousehold, sql } from "./helpers/db.ts";

// Category rows, inside the "Categories and monthly limits" panel (bill rows list category names too).
const categoryRow = (page: Page, name: string) =>
  page
    .getByRole("heading", { name: "Categories and monthly limits" })
    .locator("xpath=ancestor::section[1]")
    .locator("li", { hasText: name })
    .first();

// The tests in this file build on each other's data.
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  await resetHousehold();
});

test("owner adds income on Finances and bills on Spending, and sees the monthly totals", async ({ page }) => {
  await page.goto("/budget");
  const main = page.locator("main");

  await page.click('button:has-text("Add income")');
  await expect(page.getByText("Describe this income.")).toBeVisible();

  // A monthly salary, and a weekly side income typed with a decimal comma.
  await page.fill("#income-title", "Main salary");
  await page.fill("#income-amount", "2400");
  await page.selectOption("#income-member", { label: "Test Owner" });
  await page.click('button:has-text("Add income")');
  await expect(page.getByText("Main salary added.")).toBeVisible();
  await page.fill("#income-title", "Tutoring");
  await page.fill("#income-amount", "60,50");
  await page.selectOption("#income-frequency", "weekly");
  await page.click('button:has-text("Add income")');
  await expect(page.getByText("Tutoring added.")).toBeVisible();
  // Income 2400 + 60.50 × 52 / 12 (262.17) = 2662.17.
  await expect(main).toContainText("€2,662.17");
  await expect(main).toContainText("≈ €262.17 / month");

  // Fixed bills are on the Spending page. A bill needs a category.
  await page.goto("/categories");
  await page.fill("#expense-title", "Rent");
  await page.fill("#expense-amount", "850");
  await page.click('button:has-text("Add bill")');
  await expect(page.getByText("Choose a category.")).toBeVisible();
  await page.selectOption("#expense-category", { label: "Housing" });
  await page.click('button:has-text("Add bill")');
  await expect(page.getByText("Rent added.")).toBeVisible();
  await page.fill("#expense-title", "Car insurance");
  await page.fill("#expense-amount", "480");
  await page.selectOption("#expense-frequency", "yearly");
  await page.selectOption("#expense-category", { label: "Bills" });
  await page.click('button:has-text("Add bill")');
  await expect(page.getByText("Car insurance added.")).toBeVisible();

  // Bills 850 + 480 / 12 = 890.
  await expect(main).toContainText("€890");

  // Frequency and category stay selected for the next entry.
  await expect(page.locator("#expense-frequency")).toHaveValue("yearly");
  await expect(page.locator("#expense-category option:checked")).toHaveText("Bills");

  // Left after fixed bills, on the Finances page: 2662.17 − 890.
  await page.goto("/budget");
  await expect(main).toContainText("€1,772.17");
});

test("owner adds what the household owns, updates a value, and sees the net worth", async ({ page }) => {
  await page.goto("/budget");
  const assets = page.getByRole("heading", { name: "What you own", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(assets).toContainText("Nothing added yet.");

  await page.locator("form:has(#asset-name)").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Name it, e.g. Savings account.")).toBeVisible();
  await expect(page.getByText("Enter its value")).toBeVisible();

  await page.fill("#asset-name", "Savings account");
  await page.fill("#asset-value", "12500");
  await page.locator("form:has(#asset-name)").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Savings account added.")).toBeVisible();
  await page.fill("#asset-name", "Bitcoin");
  await page.selectOption("#asset-kind", "crypto");
  await page.fill("#asset-value", "1250,50");
  await page.locator("form:has(#asset-name)").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Bitcoin added.")).toBeVisible();
  await expect(assets).toContainText("Net worth€13,750.50");
  await expect(assets.locator("li", { hasText: "Bitcoin" })).toContainText("Crypto");

  await page.getByLabel("Value of Savings account").fill("13000");
  await assets.locator("li", { hasText: "Savings account" }).getByRole("button", { name: "Save" }).click();
  await expect(assets).toContainText("Net worth€14,250.50");

  acceptNextDialog(page);
  await page.getByRole("button", { name: "Delete Bitcoin" }).click();
  await expect(assets).toContainText("Net worth€13,000");
  await expect(assets.locator("li", { hasText: "Bitcoin" })).toHaveCount(0);
});

test("owner manages categories and limits on their own page", async ({ page }) => {
  await page.goto("/categories");

  await page.fill("#category-name", "Pets");
  await page.fill("#category-limit", "75");
  await page.click('form:has(#category-name) button[type="submit"]');
  await expect(page.getByText("Pets added.")).toBeVisible();

  await page.fill("#category-name", "groceries");
  await page.click('form:has(#category-name) button[type="submit"]');
  await expect(page.getByText("A category with this name already exists")).toBeVisible();

  const transport = categoryRow(page, "Transport");
  await transport.locator('input[name="monthlyLimit"]').fill("abc");
  await transport.getByRole("button", { name: "Save" }).click();
  await expect(transport.getByText("Enter an amount")).toBeVisible();
  await transport.locator('input[name="monthlyLimit"]').fill("240");
  await transport.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Limit €240 / month")).toBeVisible();

  await categoryRow(page, "Pets").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived categories (1)")).toBeVisible();
  await page.getByText("Archived categories (1)").click();
  await page.locator("details li", { hasText: "Pets" }).getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("li", { hasText: "Limit €75 / month" })).toBeVisible();
});

test("owner moves a bill to another category", async ({ page }) => {
  await page.goto("/categories");
  const rent = page.locator("li", { has: page.getByText("Rent", { exact: true }) });
  await expect(rent).toContainText("Monthly · Housing");
  await rent.getByLabel("Category for Rent", { exact: true }).selectOption({ label: "Bills" });
  await rent.getByRole("button", { name: "Save category for Rent" }).click();
  await expect(rent).toContainText("Now in Bills.");
  await expect(rent).toContainText("Monthly · Bills");

  await page.reload();
  await expect(rent.getByLabel("Category for Rent", { exact: true }).locator("option:checked")).toHaveText("Bills");
  await rent.getByLabel("Category for Rent", { exact: true }).selectOption({ label: "Housing" });
  await rent.getByRole("button", { name: "Save category for Rent" }).click();
  await expect(rent).toContainText("Monthly · Housing");
});

test("owner removes a bill", async ({ page }) => {
  await page.goto("/categories");
  acceptNextDialog(page);
  await page
    .locator("li", { hasText: "Car insurance" })
    .getByRole("button", { name: /Remove/ })
    .click();
  await expect(page.getByText("Car insurance", { exact: true })).toHaveCount(0);
  await expect(page.locator("main")).toContainText("€850");
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees the budget but can't change it", async ({ page }) => {
    await page.goto("/budget");
    await expect(page.locator("main")).toContainText("Main salary");
    await expect(page.locator("main")).toContainText("Net worth");
    await expect(page.locator("main form")).toHaveCount(0);
    await page.goto("/categories");
    await expect(page.locator("main")).toContainText("Rent");
    await expect(page.locator("main form")).toHaveCount(0);
  });
});

test("owner deletes an unused category, but not one with expenses", async ({ page }) => {
  const { householdId, categoryIds } = await resetHousehold();
  await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Milk', 2, CURRENT_DATE)", [
    householdId,
    categoryIds.Groceries,
  ]);
  await page.goto("/categories");

  acceptNextDialog(page);
  await categoryRow(page, "Groceries").getByRole("button", { name: "Delete Groceries" }).click();
  await expect(page.getByText("Groceries has expenses logged under it, so it can't be deleted.")).toBeVisible();

  acceptNextDialog(page);
  await categoryRow(page, "Transport").getByRole("button", { name: "Delete Transport" }).click();
  await expect(page.getByRole("button", { name: "Delete Transport" })).toHaveCount(0);

  // Archived categories can be deleted too.
  await categoryRow(page, "Housing").getByRole("button", { name: "Archive" }).click();
  await page.getByText("Archived categories (1)").click();
  acceptNextDialog(page);
  await page.locator("details li", { hasText: "Housing" }).getByRole("button", { name: "Delete Housing" }).click();
  await expect(page.getByText("Archived categories")).toHaveCount(0);
});
