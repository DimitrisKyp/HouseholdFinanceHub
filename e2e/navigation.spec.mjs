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
