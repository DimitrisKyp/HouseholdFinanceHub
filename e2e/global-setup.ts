// Runs once before the browser tests: brings the test database schema up to date, wipes it,
// and creates the test accounts and household.
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./env.mts";
import { resetDatabase, resetHousehold } from "./helpers/db.ts";

export default async function globalSetup() {
  const databaseUrl = testDatabaseUrl();
  try {
    execSync("npx drizzle-kit migrate", { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" });
  } catch (error) {
    // execSync's error carries the command's output.
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`Migrating the test database failed:\n${stdout}\n${stderr}`);
  }
  await resetDatabase();
  await resetHousehold();
}
