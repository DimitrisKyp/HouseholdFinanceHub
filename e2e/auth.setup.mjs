// Signs in once as each test account through the real sign-in form and saves the session,
// so the tests start already signed in (test.use({ storageState: authFile("viewer") })).
import { expect, test as setup } from "@playwright/test";
import { PASSWORD } from "./env.mjs";
import { authFile } from "./fixtures.mjs";
import { USERS } from "./helpers/db.mjs";

for (const [role, user] of Object.entries(USERS)) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
    await expect(page.locator("main")).toBeVisible();
    await page.context().storageState({ path: authFile(role) });
  });
}
