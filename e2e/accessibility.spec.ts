import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { BASE_URL } from "./env.mts";
import { expect, test } from "./fixtures.ts";
import { resetHousehold, sql } from "./helpers/db.ts";
import { today } from "./helpers/dates.ts";

// Automated WCAG 2.1 A/AA checks (axe-core) on every page, in both themes. axe finds about a third
// of real accessibility problems (contrast, names, labels, landmarks, ARIA misuse); keyboard use
// and screen-reader wording are covered by the other tests and by hand.
const APP_PAGES = ["/", "/budget", "/categories", "/transactions", "/insights", "/goals", "/reminders", "/members", "/account"];
const PUBLIC_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

const setTheme = (context: BrowserContext, theme: string) => context.addCookies([{ name: "theme", value: theme, url: BASE_URL }]);

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  // Readable failure output: rule, impact and the first few offending elements.
  return results.violations.map(
    v =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .slice(0, 3)
        .map(n => n.target.join(" "))
        .join("\n  ")}`,
  );
}

test.beforeAll(async () => {
  const { householdId, categoryIds } = await resetHousehold();
  // Some data, so lists, charts and badges are on screen.
  await sql("INSERT INTO expense (household_id, category_id, title, amount, spent_on) VALUES ($1, $2, 'Groceries run', 120, $3)", [
    householdId,
    categoryIds.Groceries,
    today(),
  ]);
  await sql("INSERT INTO recurring_item (household_id, type, title, amount, starts_on) VALUES ($1, 'income', 'Salary', 2500, $2)", [
    householdId,
    today(),
  ]);
});

for (const theme of ["dark", "light"]) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ context }) => setTheme(context, theme));

    test("app pages have no detectable WCAG A/AA problems", async ({ page }) => {
      for (const path of APP_PAGES) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect.soft(await violations(page), path).toEqual([]);
      }
    });

    test("the notifications pop-up has no detectable WCAG A/AA problems", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Alerts/ }).click();
      await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test("public pages have no detectable WCAG A/AA problems", async ({ page }) => {
        for (const path of PUBLIC_PAGES) {
          await page.goto(path);
          expect.soft(await violations(page), path).toEqual([]);
        }
      });
    });
  });
}

test("the breakdown drawer is a real modal dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /View budget breakdown/ }).click();
  const drawer = page.getByRole("dialog", { name: "Budget breakdown" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close" })).toBeFocused();
  expect(await violations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("keyboard users can skip the navigation", async ({ page }) => {
  await page.goto("/budget");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#content")).toBeFocused();
});
