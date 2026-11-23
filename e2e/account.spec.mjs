import { authFile, expect, test } from "./fixtures.mjs";
import { PASSWORD } from "./env.mjs";
import { resetHousehold, sql, USERS } from "./helpers/db.mjs";

// The test accounts are shared with the other spec files: anything changed here is put back.
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  await resetHousehold();
  await sql(`DELETE FROM user_preference`);
});
test.afterAll(async () => {
  await sql(`DELETE FROM user_preference`);
  await sql(`UPDATE "user" SET name = $1 WHERE email = $2`, [USERS.owner.name, USERS.owner.email]);
});

test("the theme applies at once, is remembered, and follows you to another browser", async ({ page, browser }) => {
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await page.getByLabel("Light").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("Theme saved.")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel("Light")).toBeChecked();

  // A fresh browser has no cookie until you sign in; then your saved theme comes with you.
  const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const otherPage = await other.newPage();
  await otherPage.goto("/sign-in");
  await expect(otherPage.locator("html")).toHaveAttribute("data-theme", "system");
  await otherPage.getByLabel("Email").fill(USERS.owner.email);
  await otherPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await otherPage.getByRole("button", { name: "Sign in" }).click();
  await expect(otherPage).toHaveURL(/\/$/);
  await expect(otherPage.locator("html")).toHaveAttribute("data-theme", "light");
  await other.close();

  await page.getByLabel("Same as this device").check();
  await expect(page.getByText("Theme saved.")).toBeVisible();
});

test("you can change your name", async ({ page }) => {
  await page.goto("/account");
  await page.getByLabel("Your name").fill("");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await page.getByLabel("Your name").fill("Owner Renamed");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name saved.")).toBeVisible();
  await page.goto("/members");
  await expect(page.getByText("Owner Renamed")).toBeVisible();
});

test("the owner changes the household's name and currency", async ({ page }) => {
  await page.goto("/account");
  await page.getByLabel("Household name").fill("Kitchen Table");
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Save household settings" }).click();
  await expect(page.getByText("Household settings saved.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Kitchen Table · Owner")).toBeVisible();
  await expect(page.getByText("Monthly income")).toBeVisible();
  await expect(page.locator("main")).toContainText("$0");
});

test.describe("viewer", () => {
  test.use({ storageState: authFile("viewer") });

  test("sees their own settings but not the household's", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Household settings" })).toHaveCount(0);
  });
});
