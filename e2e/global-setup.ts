// Runs once before the browser tests: brings the test database schema up to date, wipes it,
// and creates the test accounts and household.
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./env.mjs";
import { resetDatabase, resetHousehold } from "./helpers/db.mjs";

export default async function globalSetup() {
  const databaseUrl = testDatabaseUrl();
  try {
    execSync("npx drizzle-kit migrate", { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" });
  } catch (error) {
    throw new Error(`Migrating the test database failed:\n${error.stdout}\n${error.stderr}`);
  }
  await resetDatabase();
  await resetHousehold();
}
