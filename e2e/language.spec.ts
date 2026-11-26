import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { BASE_URL, PASSWORD } from "./env.mts";
import { expect, test } from "./fixtures.ts";
import { resetHousehold, sql, USERS } from "./helpers/db.ts";
import { today } from "./helpers/dates.ts";

// English and Greek. The language is a per-user choice (Account page), kept in a cookie; visitors
// who haven't chosen get their browser's preference.
const APP_PAGES = ["/", "/budget", "/categories", "/transactions", "/insights", "/goals", "/reminders", "/members", "/account"];
const PUBLIC_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];
// A message that's missing shows as "namespace.key" (see i18n/translate.ts).
const MISSING_MESSAGE =
  /\b(common|account|auth|email|dashboard|errors|budget|transactions|insights|goals|members|notifications)\.[a-z][\w.]*/;

const signedOut = { cookies: [], origins: [] };
const chooseGreek = (context: BrowserContext) => context.addCookies([{ name: "locale", value: "el", url: BASE_URL }]);

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map(
    v =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .slice(0, 3)
        .map(n => n.target.join(" "))
        .join("\n  ")}`,
  );
}

/** Checks the page is in Greek, with no untranslated message keys and no WCAG A/AA problems. */
async function expectGreekPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  expect.soft(await page.locator("body").innerText(), `${path}: untranslated message`).not.toMatch(MISSING_MESSAGE);
  expect.soft(await violations(page), path).toEqual([]);
}

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  const { householdId, categoryIds } = await resetHousehold();
  await sql(`DELETE FROM user_preference`);
  // Some data, so lists, charts and amounts are on screen.
  await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Groceries run', 1250.5, $3)", [
    householdId,
    categoryIds.Groceries,
    today(),
  ]);
  await sql("INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'income', 'Salary', 2500, $2)", [
    householdId,
    today(),
  ]);
});
test.afterAll(async () => {
  await sql(`DELETE FROM user_preference`);
});

test("every app page reads in Greek, with nothing left untranslated", async ({ page, context }) => {
  await chooseGreek(context);
  for (const path of APP_PAGES) await expectGreekPage(page, path);
  // Amounts and dates follow the language too.
  await page.goto("/transactions");
  await expect(page.locator("main")).toContainText("1.250,50");
});

test.describe("signed out", () => {
  test.use({ storageState: signedOut });

  test("public pages read in Greek, with nothing left untranslated", async ({ page, context }) => {
    await chooseGreek(context);
    for (const path of PUBLIC_PAGES) await expectGreekPage(page, path);
  });

  test("a browser that prefers Greek gets Greek, and English is one click away", async ({ browser }) => {
    const context = await browser.newContext({ storageState: signedOut, locale: "el-GR" });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "el");

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await context.close();
  });
});

test("the language chosen on the Account page applies at once and follows you to another browser", async ({ page, browser }) => {
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Ελληνικά").check();
  await expect(page.getByText("Η γλώσσα αποθηκεύτηκε.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(page.getByRole("link", { name: "Μέλη" })).toBeVisible();

  // A fresh English browser gets the saved language when you sign in.
  const other = await browser.newContext({ storageState: signedOut, locale: "en-US" });
  const otherPage = await other.newPage();
  await otherPage.goto("/sign-in");
  await expect(otherPage.locator("html")).toHaveAttribute("lang", "en");
  await otherPage.getByLabel("Email").fill(USERS.owner.email);
  await otherPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await otherPage.getByRole("button", { name: "Sign in" }).click();
  await expect(otherPage).toHaveURL(/\/$/);
  await expect(otherPage.locator("html")).toHaveAttribute("lang", "el");
  await other.close();

  await page.getByLabel("English").check();
  await expect(page.getByText("Language saved.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
