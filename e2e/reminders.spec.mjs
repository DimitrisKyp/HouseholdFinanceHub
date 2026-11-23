import { acceptNextDialog, authFile, expect, test } from "./fixtures.mjs";
import { E2E_CRON_SECRET } from "./env.mjs";
import { formatDay, today } from "./helpers/dates.mjs";
import { resetHousehold, sql } from "./helpers/db.mjs";

test.describe.configure({ mode: "serial" });

const plusDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

let ids;
test.beforeAll(async () => {
  // A monthly rent bill (€900, Housing) and an insurance bill without a category.
  ids = await resetHousehold();
  await sql(
    `INSERT INTO recurring_item (household_id, type, title, amount, category_id, starts_on) VALUES ($1, 'expense', 'Rent', 900, $2, $3)`,
    [ids.householdId, ids.categoryIds.Housing, today()],
  );
  await sql(`INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'expense', 'Car insurance', 300, $2)`, [
    ids.householdId,
    today(),
  ]);
});

const runJob = (request, secret = E2E_CRON_SECRET) =>
  request.get("/api/cron/reminders", { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });

test("owner adds tasks, finishes one and puts it back", async ({ page }) => {
  await page.goto("/reminders");
  await expect(page.getByText("Nothing to do. Nice.")).toBeVisible();

  await page.click('button:has-text("Add task")');
  await expect(page.getByText("What needs doing?")).toBeVisible();

  await page.fill("#task-title", "Buy a new kettle");
  await page.fill("#task-due", plusDays(today(), 2));
  await page.selectOption("#task-assignee", { label: "Test Editor" });
  await page.click('button:has-text("Add task")');
  await expect(page.getByText('Added "Buy a new kettle".')).toBeVisible();

  await page.fill("#task-title", "Fix the shelf");
  await page.click('button:has-text("Add task")');
  await expect(page.getByText('Added "Fix the shelf".')).toBeVisible();

  const tasks = page.getByRole("list", { name: "Things to do" });
  const kettle = tasks.getByRole("listitem").filter({ hasText: "Buy a new kettle" });
  await expect(kettle).toContainText("In 2 days");
  await expect(kettle).toContainText("Test Editor");
  await expect(tasks.getByRole("listitem").filter({ hasText: "Fix the shelf" })).toContainText("Whenever");

  await page.getByRole("button", { name: "Mark Fix the shelf as done" }).click();
  await expect(page.getByText("Done recently")).toBeVisible();
  await expect(tasks).not.toContainText("Fix the shelf");
  await page.getByRole("button", { name: "Put Fix the shelf back on the list" }).click();
  await expect(tasks).toContainText("Fix the shelf");

  acceptNextDialog(page);
  await page.getByRole("button", { name: "Delete Fix the shelf" }).click();
  await expect(tasks).not.toContainText("Fix the shelf");
});

test("owner sets a bill reminder and marks it paid, logging the expense", async ({ page }) => {
  await page.goto("/reminders");
  const bills = page.getByRole("list", { name: "Bills to pay" });
  const rent = bills.getByRole("listitem").filter({ hasText: "Rent" });
  await expect(rent).toContainText("No reminder");

  await rent.getByText("Set a reminder").click();
  await rent.getByLabel("Next due date").fill(today());
  await rent.getByLabel("Remind me").selectOption({ label: "3 days before" });
  await rent.getByRole("button", { name: "Save reminder" }).click();
  await expect(rent.getByText("Reminder saved for Rent.")).toBeVisible();
  await expect(rent).toContainText("Due today");

  // On the dashboard too.
  await page.goto("/");
  const comingUp = page.getByRole("list", { name: "Coming up" });
  await expect(comingUp).toContainText("Rent");
  await expect(comingUp).toContainText("Due today");
  await expect(comingUp).toContainText("Buy a new kettle");

  await page.goto("/reminders");
  await rent.getByRole("button", { name: "Mark Rent as paid" }).click();
  await expect(rent.getByText("Rent marked as paid and logged as an expense.")).toBeVisible();
  await expect(rent).not.toContainText("Due today");

  const { rows } = await sql(`SELECT title, amount FROM expense WHERE household_id = $1`, [ids.householdId]);
  expect(rows).toEqual([{ title: "Rent", amount: "900.00" }]);
  const [{ due_on: dueOn, paid_through: paidThrough }] = (
    await sql(`SELECT due_on::text, paid_through::text FROM recurring_item WHERE title = 'Rent'`)
  ).rows;
  expect(paidThrough).toBe(dueOn);
});

test("the daily job needs its secret, alerts the right people once, and survives failed emails", async ({ page, request }) => {
  expect((await runJob(request, null)).status()).toBe(401);
  expect((await runJob(request, "wrong")).status()).toBe(401);

  // Car insurance due today, unassigned: goes to the owner and the editor (not the viewer).
  await sql(`UPDATE recurring_item SET due_on = $1 WHERE title = 'Car insurance'`, [today()]);
  // The kettle (assigned to the editor) is due in 2 days, with the default 1-day reminder: not yet.
  const first = await runJob(request);
  expect(first.status()).toBe(200);
  const result = await first.json();
  expect(result.notifications).toBe(2);
  // The test server has no SMTP, so the emails fail; the alerts are sent anyway.
  expect(result.emailErrors).toBe(2);

  const sent = await sql(
    `SELECT u.email, n.data->>'title' AS title FROM notification n JOIN "user" u ON u.id = n.user_id WHERE n.type = 'reminder' ORDER BY u.email`,
  );
  expect(sent.rows).toEqual([
    { email: "editor@e2e.test", title: "Car insurance" },
    { email: "owner@e2e.test", title: "Car insurance" },
  ]);

  // Running again sends nothing new.
  expect((await (await runJob(request)).json()).notifications).toBe(0);

  await page.goto("/notifications");
  await expect(page.getByText("Car insurance is due today")).toBeVisible();
  await expect(page.getByText(`€300, due on ${formatDay(today())}.`)).toBeVisible();
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees reminders but can't change them", async ({ page }) => {
    await page.goto("/reminders");
    await expect(page.getByRole("list", { name: "Things to do" })).toContainText("Buy a new kettle");
    await expect(page.getByRole("list", { name: "Bills to pay" })).toContainText("Car insurance");
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /as paid/ })).toHaveCount(0);
    await expect(page.getByText("Set a reminder")).toHaveCount(0);
  });
});
