// The `test` used by every spec: like Playwright's, but a test also fails if the page throws
// an uncaught JavaScript error. Tests run signed in as the owner unless they choose another role.
import { test as base, expect } from "@playwright/test";

/** Saved session for "owner" | "editor" | "viewer" (written by auth.setup.mjs). */
export const authFile = role => `e2e/.auth/${role}.json`;

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(page);
    expect(errors, "uncaught errors in the page").toEqual([]);
  },
});

export { expect };

/** Accepts the next confirm() dialog (used by delete buttons). */
export const acceptNextDialog = page => page.once("dialog", dialog => dialog.accept());
