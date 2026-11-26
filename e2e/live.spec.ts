import type { Browser, Page } from "@playwright/test";
import { authFile, expect, test } from "./fixtures.ts";
import { today } from "./helpers/dates.ts";
import { resetHousehold, sql, type Role, type TestHousehold } from "./helpers/db.ts";

// Two people in the same household, each in their own browser: the owner (the default page) and
// another member who makes the changes. Nobody reloads; changes arrive over /api/events.
const liveConnected = (page: Page) => expect(page.locator('[data-live="open"]')).toHaveCount(1);
const recentExpenses = (page: Page) => page.getByRole("list", { name: "Recent expenses" });
const alertsLink = (page: Page) => page.getByRole("button", { name: /^Alerts/ });

async function openAs(browser: Browser, role: Role, path: string) {
  const context = await browser.newContext({ storageState: authFile(role) });
  const page = await context.newPage();
  await page.goto(path);
  await liveConnected(page);
  return { context, page };
}

async function addExpense(page: Page, { title, amount, category }: { title: string; amount: string; category: string }) {
  await page.fill("#expense-title", title);
  await page.fill("#expense-amount", amount);
  await page.selectOption("#expense-category", { label: category });
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText(`${title} (`)).toBeVisible();
}

let household: TestHousehold;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  household = await resetHousehold();
});

test("an expense someone else adds appears without reloading, with a message", async ({ page, browser }) => {
  await page.goto("/");
  await liveConnected(page);
  const editor = await openAs(browser, "editor", "/");

  await addExpense(editor.page, { title: "Coffee beans", amount: "12.40", category: "Transport" });

  // The message first: it disappears after a few seconds, while the page's refresh can be slow.
  await expect(page.getByText("Test Editor added Coffee beans (€12.40)")).toBeVisible();
  await expect(recentExpenses(page).getByText("Coffee beans", { exact: true })).toBeVisible();
  // The person who made the change isn't told about their own change.
  await expect(editor.page.getByText("Test Editor added Coffee beans")).toHaveCount(0);
  await editor.context.close();
});

test("a budget alert updates everyone's badge at once, including the person who caused it", async ({ page, browser }) => {
  // Groceries (limit €650) already has €500 this month.
  await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Earlier shopping', 500, $3)", [
    household.householdId,
    household.categoryIds.Groceries,
    today(),
  ]);
  await page.goto("/");
  await liveConnected(page);
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts");
  const editor = await openAs(browser, "editor", "/");

  await addExpense(editor.page, { title: "Big shop", amount: "60", category: "Groceries" });

  await expect(alertsLink(editor.page)).toHaveAccessibleName("Alerts, 1 unread");
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 1 unread");
  await editor.context.close();
});

test("budget changes reach other open pages", async ({ page, browser }) => {
  await page.goto("/budget");
  await liveConnected(page);
  const editor = await openAs(browser, "editor", "/budget");

  await editor.page.fill("#income-title", "Side job");
  await editor.page.fill("#income-amount", "300");
  await editor.page.click('button:has-text("Add income")');
  await expect(editor.page.getByText("Side job added.")).toBeVisible();

  await expect(page.locator("main").getByText("Side job", { exact: true })).toBeVisible();
  await expect(page.getByText("Test Editor updated the budget")).toBeVisible();
  await editor.context.close();
});

test("a new expense is listed while it's saved (optimistic)", async ({ page }) => {
  await page.goto("/");
  // Hold the Server Action (a POST to the page) for a moment, as on a slow connection.
  // Replaced by the promise's resolve function straight away (the executor runs synchronously).
  let release = () => {};
  const held = new Promise<void>(resolve => (release = resolve));
  await page.route("**/*", async route => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await held;
    await route.continue();
  });

  await page.fill("#expense-title", "Lunch out");
  await page.fill("#expense-amount", "18,90");
  await page.selectOption("#expense-category", { label: "Groceries" });
  await page.click('button:has-text("Add expense")');

  const row = recentExpenses(page).getByRole("listitem").filter({ hasText: "Lunch out" });
  await expect(row).toContainText("Saving…");
  await expect(row).toContainText("€18.90");
  release();
  await expect(page.getByText("Lunch out (€18.90) added.")).toBeVisible();
  await expect(row).not.toContainText("Saving…");
  await page.unroute("**/*");
});

test("someone removed from the household loses access straight away", async ({ page, browser }) => {
  const viewer = await openAs(browser, "viewer", "/");

  await page.goto("/members");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("li", { hasText: "Test Viewer" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("li", { hasText: "Test Viewer" })).toHaveCount(0);
  await expect(page.getByText("Test Viewer was removed from the household.")).toBeVisible();

  // Their page reloads its data, finds no household and sends them to set one up.
  await expect(viewer.page).toHaveURL(/\/onboarding/);
  await viewer.context.close();
});
