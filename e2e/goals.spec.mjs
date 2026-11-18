import { acceptNextDialog, authFile, expect, test } from "./fixtures.mjs";
import { dayOf, formatDay, monthStart, parts, today } from "./helpers/dates.mjs";
import { resetHousehold } from "./helpers/db.mjs";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  await resetHousehold();
});

const card = (page, name) => page.locator("article", { has: page.getByRole("heading", { name, exact: true }) });

/** A target date exactly 10 whole months away (day 28 when today is later than the 28th). */
function tenMonthsAway() {
  const day = parts(today())[2];
  return day <= 28 ? dayOf(monthStart(today(), 10), day) : dayOf(monthStart(today(), 11), 28);
}

test("owner adds goals, with validation and a monthly plan", async ({ page }) => {
  await page.goto("/goals");
  await expect(page.locator("main")).toContainText("Add your first goal above.");

  await page.fill("#goal-date", "2020-01-01");
  await page.click('button:has-text("Add goal")');
  await expect(page.getByText("Name the goal.")).toBeVisible();
  await expect(page.getByText("Enter the amount you want to reach")).toBeVisible();
  await expect(page.getByText("Choose a date in the future.")).toBeVisible();

  const target = tenMonthsAway();
  await page.fill("#goal-name", "Emergency fund");
  await page.fill("#goal-target", "5000");
  await page.fill("#goal-date", target);
  await page.fill("#goal-starting", "1000");
  await page.fill("#goal-note", "Three months of expenses");
  await page.click('button:has-text("Add goal")');
  await expect(page.getByText("Emergency fund added.")).toBeVisible();

  const fund = card(page, "Emergency fund");
  await expect(fund).toContainText("€1,000");
  await expect(fund).toContainText("of €5,000");
  await expect(fund).toContainText("20%");
  // €4,000 still to save over 10 months.
  await expect(fund).toContainText(`Save about €400 a month to reach it by ${formatDay(target)}`);

  await page.fill("#goal-name", "New laptop");
  await page.fill("#goal-target", "1200");
  await page.click('button:has-text("Add goal")');
  await expect(page.getByText("New laptop added.")).toBeVisible();
});

test("owner adds and withdraws money, then completes the goal", async ({ page }) => {
  await page.goto("/goals");
  const laptop = card(page, "New laptop");

  await laptop.locator('input[name="amount"]').fill("300,50");
  await laptop.locator('input[name="note"]').fill("November");
  await laptop.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByText("€300.50 added to New laptop.")).toBeVisible();
  await expect(laptop).toContainText("€300.50");
  await expect(laptop).toContainText("25%");

  await laptop.locator('input[name="amount"]').fill("500");
  await laptop.getByRole("button", { name: "Withdraw" }).click();
  await expect(laptop.getByText("Only €300.50 is saved for this goal.")).toBeVisible();

  await laptop.locator('input[name="amount"]').fill("100");
  await laptop.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByText("€100 taken from New laptop.")).toBeVisible();
  await expect(laptop).toContainText("€200.50");
  await laptop.getByText(/History \(2 entries\)/).click();
  await expect(laptop).toContainText("−€100");
  await expect(laptop).toContainText("+€300.50");

  await laptop.locator('input[name="amount"]').fill("999.50");
  await laptop.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByText("€999.50 added to New laptop.")).toBeVisible();
  await expect(laptop).toContainText("Target reached");
  await expect(laptop).toContainText("100%");

  await laptop.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("Completed (1)")).toBeVisible();
});

test("owner pauses, resumes and deletes goals", async ({ page }) => {
  await page.goto("/goals");
  const fund = card(page, "Emergency fund");
  await fund.getByRole("button", { name: "Pause" }).click();
  await expect(fund.getByText("Paused", { exact: true })).toBeVisible();
  await expect(fund.locator('input[name="amount"]')).toHaveCount(0);
  await fund.getByRole("button", { name: "Resume" }).click();
  await expect(fund.locator('input[name="amount"]')).toBeVisible();

  acceptNextDialog(page);
  await card(page, "New laptop").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Completed (1)")).toHaveCount(0);
  await expect(page.locator("article")).toHaveCount(1);
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees goals but can't change them", async ({ page }) => {
    await page.goto("/goals");
    await expect(page.locator("main")).toContainText("Emergency fund");
    await expect(page.locator("main form")).toHaveCount(0);
  });
});
