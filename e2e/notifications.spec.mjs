import { createHash, randomBytes } from "node:crypto";
import { authFile, expect, test } from "./fixtures.mjs";
import { PASSWORD } from "./env.mjs";
import { dayOf, formatMonth, monthStart, today } from "./helpers/dates.mjs";
import { resetHousehold, sql } from "./helpers/db.mjs";

// The "Alerts" link in the navigation; its name includes the unread count ("Alerts, 2 unread").
const alertsLink = page => page.getByRole("navigation").getByRole("link", { name: /^Alerts/ });
const notificationList = page => page.getByRole("heading", { name: "Latest" }).locator("xpath=ancestor::section[1]");

async function addExpense(page, { title, amount, category, date }) {
  await page.goto("/");
  await page.fill("#expense-title", title);
  await page.fill("#expense-amount", amount);
  await page.selectOption("#expense-category", { label: category });
  if (date) await page.fill("#expense-date", date);
  await page.click('button:has-text("Add expense")');
  await expect(page.getByText(`${title} (`)).toBeVisible();
}

let household;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  household = await resetHousehold();
  // Groceries (limit €650) already has €500 this month, added straight to the database (no alert).
  await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Earlier shopping', 500, $3)", [
    household.householdId,
    household.categoryIds.Groceries,
    today(),
  ]);
});

test("starts empty", async ({ page }) => {
  await page.goto("/notifications");
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts");
  await expect(page.getByText("You'll get one when a bill or task is due, a category nears its monthly limit")).toBeVisible();
});

test("budget alerts at 80% and 100%, once each", async ({ page }) => {
  const period = formatMonth(monthStart(today()));
  // €530 of €650 = 81%.
  await addExpense(page, { title: "Bakery", amount: "30", category: "Groceries" });
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 1 unread");
  // Still above 80%: no second alert. A big back-dated expense doesn't alert about last month.
  await addExpense(page, { title: "Fruit", amount: "10", category: "Groceries" });
  await addExpense(page, { title: "Old bill", amount: "900", category: "Bills", date: dayOf(monthStart(today(), -1), 10) });
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 1 unread");
  // €740: over budget.
  await addExpense(page, { title: "Party food", amount: "200", category: "Groceries" });
  await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 2 unread");

  await alertsLink(page).click();
  const list = notificationList(page);
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByRole("listitem").first()).toContainText("Groceries is over budget");
  await expect(list.getByRole("listitem").first()).toContainText(`€740 spent of €650 in ${period}: €90 over.`);
  await expect(list.getByRole("listitem").nth(1)).toContainText("Groceries is at 81% of its budget");
  await expect(list.getByRole("listitem").nth(1)).toContainText(`€530 spent of €650 in ${period}, €120 left.`);
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("gets the alerts too, opens one and marks the rest read", async ({ page }) => {
    await page.goto("/");
    await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 2 unread");
    await page.goto("/notifications");
    await expect(page.getByText("2 unread.")).toBeVisible();

    // Opening one goes to the category's transactions and marks it read.
    await notificationList(page)
      .getByRole("button", { name: /Groceries is over budget/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/transactions\\?category=${household.categoryIds.Groceries}$`));
    await expect(page.getByText("Party food")).toBeVisible();
    await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 1 unread");

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByText("All read.")).toBeVisible();
    await expect(alertsLink(page)).toHaveAccessibleName("Alerts");
    await expect(page.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
  });
});

test("everyone hears when a goal reaches its target", async ({ page, browser }) => {
  const { rows } = await sql("INSERT INTO goal (household_id, name, target_amount) VALUES ($1, 'Bike', 500) RETURNING id", [
    household.householdId,
  ]);
  await sql("INSERT INTO goal_contribution (goal_id, amount, contributed_on) VALUES ($1, 450, $2)", [rows[0].id, today()]);

  await page.goto("/goals");
  const bike = page.locator("article", { has: page.getByRole("heading", { name: "Bike", exact: true }) });
  await bike.locator('input[name="amount"]').fill("50");
  await bike.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByText("€50 added to Bike.")).toBeVisible();

  const editor = await browser.newContext({ storageState: authFile("editor") });
  const editorPage = await editor.newPage();
  await editorPage.goto("/notifications");
  await expect(notificationList(editorPage)).toContainText("Goal reached: Bike");
  await expect(notificationList(editorPage)).toContainText("€500 saved of €500.");
  await editor.close();
});

test("a member hears when their role changes", async ({ page, browser }) => {
  await page.goto("/members");
  await page.getByLabel("Role for Test Editor", { exact: true }).selectOption("viewer");
  await page.getByRole("button", { name: "Save role for Test Editor" }).click();
  await expect(page.getByText("Role changed to Viewer.")).toBeVisible();

  const editor = await browser.newContext({ storageState: authFile("editor") });
  const editorPage = await editor.newPage();
  await editorPage.goto("/notifications");
  await expect(notificationList(editorPage)).toContainText("You're now a Viewer in Test Household");
  await editor.close();

  await page.getByLabel("Role for Test Editor", { exact: true }).selectOption("editor");
  await page.getByRole("button", { name: "Save role for Test Editor" }).click();
  await expect(page.getByText("Role changed to Editor.")).toBeVisible();
});

test.describe("a new member joining through an invite", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is welcomed, and the owner is told", async ({ page, browser }) => {
    const token = randomBytes(32).toString("base64url");
    const email = `newcomer-${Date.now()}@e2e.test`;
    await sql(
      `INSERT INTO invite (household_id, email, role, token_hash, invited_by_user_id, expires_at)
       VALUES ($1, $2, 'viewer', $3, $4, now() + interval '1 day')`,
      [household.householdId, email, createHash("sha256").update(token).digest("hex"), household.userIds.owner],
    );

    await page.goto(`/invite/${token}`);
    await page.getByLabel("Your name").fill("Nova Newcomer");
    await page.getByLabel("Choose a password").fill(PASSWORD);
    await page.getByLabel("Repeat password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account and join" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(alertsLink(page)).toHaveAccessibleName("Alerts, 1 unread");
    await page.goto("/notifications");
    await expect(notificationList(page)).toContainText("Welcome to Test Household");
    await expect(notificationList(page)).toContainText("Test Owner invited you as Viewer.");

    const owner = await browser.newContext({ storageState: authFile("owner") });
    const ownerPage = await owner.newPage();
    await ownerPage.goto("/notifications");
    await expect(notificationList(ownerPage)).toContainText("Nova Newcomer joined Test Household");
    await expect(notificationList(ownerPage)).toContainText("They accepted the invitation and joined as Viewer.");
    await owner.close();
  });
});
