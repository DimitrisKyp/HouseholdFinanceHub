// Browser (end-to-end) tests: `npm run test:e2e`. Builds the app, starts it on port 3100 against
// the test database, and drives it like a user. See "Tests" in README.md.
import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import { BASE_URL, E2E_CRON_SECRET, E2E_PORT, MARKET_STUB_URL, testDatabaseUrl } from "./e2e/env.mts";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // The tests share one database, so they run one at a time, in file order.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // In CI, the github reporter also annotates each failing test (with its error) on the run and PR.
  reporter: [["list"], ["html", { open: "never" }], ...(CI ? [["github"] satisfies ReporterDescription] : [])],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/global-setup.ts",

  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    viewport: { width: 1400, height: 1000 },
    // CI installs Playwright's Chromium; locally the installed Edge is used, so no extra download.
    // "chromium" is the full browser in its new headless mode, like Edge locally (Playwright's default
    // on CI would be the stripped-down "headless shell").
    channel: process.env.E2E_BROWSER_CHANNEL ?? (CI ? "chromium" : "msedge"),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    // Signs in once per role and saves the session for the tests.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/owner.json" },
    },
  ],

  webServer: [
    // Stand-in for the news feed and exchange-rate API, so tests never depend on the internet.
    {
      command: "node e2e/market-stub.mts",
      url: `${MARKET_STUB_URL}/health`,
      reuseExistingServer: false,
      stdout: "ignore",
    },
    // The production build, like on the server. Each run rebuilds, so the tests never run old code.
    {
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
        // Lets the tests run the daily reminders job (/api/cron/reminders).
        CRON_SECRET: E2E_CRON_SECRET,
        NEXT_TELEMETRY_DISABLED: "1",
        NEWS_FEED_URL: `${MARKET_STUB_URL}/news.xml`,
        NEWS_SOURCE_NAME: "Test News",
        RATES_API_URL: `${MARKET_STUB_URL}/rates`,
        // Short, so the tests can see a refresh fail and stale data being shown.
        MARKET_CACHE_SECONDS: "2",
        // Every test request comes from one address; don't let the telemetry rate limit get in the way.
        TELEMETRY_MAX_PER_MINUTE: "100000",
      },
    },
  ],
});
