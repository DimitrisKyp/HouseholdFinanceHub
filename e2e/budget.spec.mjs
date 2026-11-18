import { acceptNextDialog, authFile, expect, test } from "./fixtures.mjs";
import { resetHousehold } from "./helpers/db.mjs";

// The tests in this file build on each other's data.
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  await resetHousehold();
});

test("owner adds income and bills, and sees the monthly totals", async ({ page }) => {
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

  // A bill needs a category.
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

  // Income 2400 + 60.50 × 52 / 12 (262.17) = 2662.17; bills 850 + 480 / 12 = 890.
  await expect(main).toContainText("€2,662.17");
  await expect(main).toContainText("≈ €262.17 / month");
  await expect(main).toContainText("€890");
  await expect(main).toContainText("€1,772.17");

  // Frequency and category stay selected for the next entry.
  await expect(page.locator("#expense-frequency")).toHaveValue("yearly");
  await expect(page.locator("#expense-category option:checked")).toHaveText("Bills");
});

test("owner manages categories and limits", async ({ page }) => {
  await page.goto("/budget");

  await page.fill("#category-name", "Pets");
  await page.fill("#category-limit", "75");
  await page.click('form:has(#category-name) button[type="submit"]');
  await expect(page.getByText("Pets added.")).toBeVisible();

  await page.fill("#category-name", "groceries");
  await page.click('form:has(#category-name) button[type="submit"]');
  await expect(page.getByText("A category with this name already exists")).toBeVisible();

  const transport = page.locator("li", { hasText: "Transport" }).first();
  await transport.locator('input[name="monthlyLimit"]').fill("abc");
  await transport.getByRole("button", { name: "Save" }).click();
  await expect(transport.getByText("Enter an amount")).toBeVisible();
  await transport.locator('input[name="monthlyLimit"]').fill("240");
  await transport.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Limit €240 / month")).toBeVisible();

  await page.locator("li", { hasText: "Pets" }).first().getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived categories (1)")).toBeVisible();
  await page.getByText("Archived categories (1)").click();
  await page.locator("details li", { hasText: "Pets" }).getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("li", { hasText: "Limit €75 / month" })).toBeVisible();
});

test("owner removes a bill", async ({ page }) => {
  await page.goto("/budget");
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
    await expect(page.locator("main form")).toHaveCount(0);
  });
});
