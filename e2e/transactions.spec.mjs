import { acceptNextDialog, authFile, expect, test } from "./fixtures.mjs";
import { dayOf, formatDay, monthStart, parts, today } from "./helpers/dates.mjs";
import { resetHousehold, sql } from "./helpers/db.mjs";

const thisMonth = monthStart(today());
const lastMonth = monthStart(today(), -1);

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  // This month: 40 expenses "Item 01".."Item 40" of €10..€400 (odd: Groceries paid by the viewer,
  // even: Transport paid by the owner), spread from the 1st to today, plus two €1 bills.
  // Total 8,200 + 2 = €8,202 in 42 rows. Last month: 20 bills of €5 = €100.
  const { householdId, userIds, categoryIds } = await resetHousehold();
  const daysSoFar = parts(today())[2];
  const rows = [];
  for (let i = 1; i <= 40; i++) {
    const odd = i % 2 === 1;
    const day = dayOf(thisMonth, ((i - 1) % daysSoFar) + 1);
    rows.push([
      odd ? categoryIds.Groceries : categoryIds.Transport,
      `Item ${String(i).padStart(2, "0")}`,
      i * 10,
      day,
      odd ? userIds.viewer : userIds.owner,
    ]);
  }
  for (let i = 1; i <= 20; i++) rows.push([categoryIds.Bills, `Last month bill ${i}`, 5, dayOf(lastMonth, i), userIds.owner]);
  rows.push([categoryIds.Bills, "Discount 50% off", 1, thisMonth, null]);
  rows.push([categoryIds.Bills, "Plain 50 euro", 1, thisMonth, null]);
  for (const row of rows) {
    await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on, paid_by_user_id) VALUES ($1, $2, $3, $4, $5, $6)", [
      householdId,
      ...row,
    ]);
  }
});

const summary = page => page.locator("main [aria-live=polite]").filter({ hasText: "transaction" }).first();
const rows = page => page.locator("tbody tr");

test("lists this month newest first, 25 per page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.getByText("Every expense, searchable.")).toBeVisible();
  await expect(summary(page)).toContainText("42 transactions");
  await expect(summary(page)).toContainText("€8,202");
  await expect(rows(page)).toHaveCount(25);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(rows(page).first()).toContainText(formatDay(today()));

  await page.getByRole("link", { name: "Older →" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(rows(page)).toHaveCount(17);
});

test("sorts by a column and keeps the sort when filtering", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("link", { name: /^Amount/ }).click();
  await page.waitForURL(/sort=amount/);
  await expect(rows(page).first()).toContainText("€400");
  await page.getByRole("link", { name: /^Amount/ }).click();
  await page.waitForURL(/dir=asc/);
  await expect(rows(page).first()).toContainText("€1");
  await expect(page.locator("th[aria-sort=ascending]")).toHaveCount(1);

  await page.selectOption("#filter-category", { label: "Groceries" });
  await page.selectOption("#filter-member", { label: "Test Viewer" });
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForURL(/category=/);
  // Groceries are the odd items, all paid by the viewer: 10 + 30 + … + 390 = 4,000.
  await expect(summary(page)).toContainText("20 transactions");
  await expect(summary(page)).toContainText("€4,000");
  expect(page.url()).toContain("sort=amount");
  expect(page.url()).toContain("dir=asc");
});

test("searches descriptions literally and case-insensitively", async ({ page }) => {
  await page.goto("/transactions?from=&to=&q=50%25");
  await expect(summary(page)).toContainText("1 transaction ");
  await expect(page.locator("tbody")).toContainText("Discount 50% off");

  await page.goto("/transactions?from=&to=&q=ITEM 0");
  await expect(summary(page)).toContainText("9 transactions");

  await page.goto("/transactions?from=&to=&q=zzzz");
  await expect(page.getByText("No transactions match these filters.")).toBeVisible();
});

test("date presets and a custom range", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("link", { name: "Last month" }).click();
  await page.waitForURL(new RegExp(`from=${lastMonth}`));
  await expect(summary(page)).toContainText("20 transactions");
  await expect(summary(page)).toContainText("€100");
  await expect(page.getByRole("link", { name: "Last month" })).toHaveAttribute("aria-current", "true");

  await page.getByRole("link", { name: "All time" }).click();
  await page.waitForURL(/from=&to=$/);
  await expect(summary(page)).toContainText("62 transactions");

  // A reversed range is swapped rather than rejected.
  await page.fill("#filter-from", dayOf(thisMonth, 10));
  await page.fill("#filter-to", dayOf(thisMonth, 1));
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForURL(new RegExp(`from=${dayOf(thisMonth, 10)}`));
  await expect(summary(page)).toContainText(`${formatDay(dayOf(thisMonth, 1))} – ${formatDay(dayOf(thisMonth, 10))}`);
});

test("ignores invalid filter values in the address", async ({ page }) => {
  const response = await page.goto("/transactions?from=garbage&category=nope&member=%27;drop&sort=evil&dir=x&page=-5");
  expect(response.status()).toBe(200);
  await expect(summary(page)).toContainText("62 transactions");
});

test("owner deletes an expense from the table", async ({ page }) => {
  await page.goto("/transactions?from=&to=&q=Plain");
  acceptNextDialog(page);
  await page.getByRole("button", { name: "Delete Plain 50 euro" }).click();
  await expect(page.getByText("No transactions match these filters.")).toBeVisible();
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees transactions without delete buttons", async ({ page }) => {
    await page.goto("/transactions");
    await expect(rows(page)).toHaveCount(25);
    await expect(page.getByRole("button", { name: /^Delete/ })).toHaveCount(0);
  });
});
