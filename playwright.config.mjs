// Browser (end-to-end) tests: `npm run test:e2e`. Builds the app, starts it on port 3100 against
// the test database, and drives it like a user. See "Tests" in README.md.
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, E2E_PORT, testDatabaseUrl } from "./e2e/env.mjs";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // The tests share one database, so they run one at a time, in file order.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/global-setup.mjs",

  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    viewport: { width: 1400, height: 1000 },
    // CI installs Playwright's Chromium; locally the installed Edge is used, so no extra download.
    channel: process.env.E2E_BROWSER_CHANNEL ?? (CI ? undefined : "msedge"),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    // Signs in once per role and saves the session for the tests.
    { name: "setup", testMatch: /auth\.setup\.mjs/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.mjs/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/owner.json" },
    },
  ],

  // The production build, like on the server. Each run rebuilds, so the tests never run old code.
  webServer: {
    command: `npm run build && npm run start -- --port ${E2E_PORT}`,
    url: `${BASE_URL}/sign-in`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    // Real environment variables take precedence over .env.local, so the app uses the test database.
    env: {
      DATABASE_URL: testDatabaseUrl(),
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: process.env.E2E_AUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else-0123456789",
      // No emails leave the test server: without SMTP the app refuses to send in production.
      SMTP_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
