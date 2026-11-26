// Settings shared by playwright.config.ts, the global setup and the test helpers.
// The browser tests wipe their database, so they only ever run against TEST_DATABASE_URL
// (from the environment, or from .env.local: see `npm run db:init-test`), never DATABASE_URL.
import * as nextEnv from "@next/env";

// @next/env is CommonJS: depending on the loader its exports appear directly or under `default`.
// Its types only describe the first case, so the second is added here.
const loadEnvConfig = nextEnv.loadEnvConfig ?? (nextEnv as typeof nextEnv & { default?: typeof nextEnv }).default?.loadEnvConfig;
if (!loadEnvConfig) throw new Error("@next/env has no loadEnvConfig");
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

export const E2E_PORT = 3100;
/** The stand-in for the news feed and exchange-rate API (e2e/market-stub.mts). */
export const MARKET_STUB_PORT = 3101;
export const MARKET_STUB_URL = `http://localhost:${MARKET_STUB_PORT}`;
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const PASSWORD = "e2e-password-123";

/** The test database URL. Throws (before anything is wiped) if it looks like the real database. */
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Locally, run `npm run db:init-test` once to create the test database.");
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL: the browser tests wipe it.");
  }
  if (!new URL(url).pathname.includes("test")) {
    throw new Error("The test database's name must contain 'test' (a safety check, since the browser tests wipe it).");
  }
  return url;
}

/** The daily reminders job's secret on the test server (see playwright.config.ts). */
export const E2E_CRON_SECRET = "e2e-cron-secret-not-used-anywhere-else";
