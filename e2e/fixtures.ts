// The `test` used by every spec: like Playwright's, but a test also fails if the page throws
// an uncaught JavaScript error. Tests run signed in as the owner unless they choose another role.
import { test as base, expect, type Page } from "@playwright/test";
import type { Role } from "./helpers/db.ts";

/** Saved session for "owner" | "editor" | "viewer" (written by auth.setup.ts). */
export const authFile = (role: Role) => `e2e/.auth/${role}.json`;

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(page);
    expect(errors, "uncaught errors in the page").toEqual([]);
  },
});

export { expect };

/** Accepts the next confirm() dialog (used by delete buttons). */
export const acceptNextDialog = (page: Page) => page.once("dialog", dialog => dialog.accept());
