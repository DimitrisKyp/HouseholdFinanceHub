import { authFile, expect, test } from "./fixtures.ts";
import { resetHousehold } from "./helpers/db.ts";

const PAGES = ["/", "/budget", "/categories", "/goals", "/transactions", "/insights", "/reminders", "/members", "/account"];

test.beforeAll(async () => {
  await resetHousehold();
});

test("an unknown address shows the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("app pages redirect to sign-in", async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page, `${path} should redirect`).toHaveURL(/\/sign-in/);
    }
  });
});

for (const role of ["owner", "editor", "viewer"] as const) {
  test.describe(role, () => {
    test.use({ storageState: authFile(role) });

    test("every page loads", async ({ page }) => {
      for (const path of PAGES) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator("main"), path).toBeVisible();
      }
    });
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("every page is in the burger menu on the left", async ({ page }) => {
    await page.goto("/");
    // No side column or bar on a phone: just the burger button.
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    // Nothing sticks out sideways, even on a narrow phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    const burger = page.getByRole("button", { name: "Menu", exact: true });
    expect((await burger.boundingBox())?.x).toBeLessThan(40);
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    const nav = page.getByRole("dialog", { name: "Menu" }).getByRole("navigation", { name: "Main" });
    for (const name of ["Dashboard", "Finances", "Spending", "Transactions", "Insights", "Goals", "Reminders", "Members"]) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toBeFocused();

    await burger.click();
    await nav.getByRole("link", { name: "Finances", exact: true }).click();
    await expect(page).toHaveURL(/\/budget$/);
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await burger.click();
    await expect(nav.getByRole("link", { name: "Finances", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });
});
