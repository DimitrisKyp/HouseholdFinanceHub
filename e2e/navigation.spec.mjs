import { authFile, expect, test } from "./fixtures.mjs";
import { resetHousehold } from "./helpers/db.mjs";

const PAGES = ["/", "/budget", "/goals", "/transactions", "/insights", "/members", "/notifications", "/account"];

test.beforeAll(async () => {
  await resetHousehold();
});

test("an unknown address shows the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response.status()).toBe(404);
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

for (const role of ["owner", "editor", "viewer"]) {
  test.describe(role, () => {
    test.use({ storageState: authFile(role) });

    test("every page loads", async ({ page }) => {
      for (const path of PAGES) {
        const response = await page.goto(path);
        expect(response.status(), path).toBe(200);
        await expect(page.locator("main"), path).toBeVisible();
      }
    });
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("everyday pages are in the bar, the rest under More", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    for (const name of ["Dashboard", "Transactions", "Insights", "Goals", "Alerts"]) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Budget", exact: true })).toBeHidden();
    // Nothing sticks out sideways, even on a narrow phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    const more = nav.getByRole("button", { name: "More" });
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(more).toHaveAttribute("aria-expanded", "false");

    await more.click();
    await nav.getByRole("link", { name: "Budget", exact: true }).click();
    await expect(page).toHaveURL(/\/budget$/);
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    await expect(nav.getByRole("link", { name: "Budget", exact: true })).toHaveAttribute("aria-current", "page");
  });
});
