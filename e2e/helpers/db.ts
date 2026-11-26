// Direct access to the test database: create the test accounts, and reset the household
// before each spec file so every file starts from the same known state.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import pg, { type QueryResultRow } from "pg";
import { PASSWORD, testDatabaseUrl } from "../env.mts";

export const USERS = {
  owner: { email: "owner@e2e.test", name: "Test Owner" },
  editor: { email: "editor@e2e.test", name: "Test Editor" },
  viewer: { email: "viewer@e2e.test", name: "Test Viewer" },
};
export type Role = keyof typeof USERS;

export const CATEGORIES = [
  ["Groceries", 650],
  ["Bills", 380],
  ["Transport", null],
  ["Housing", null],
] as const;
export type CategoryName = (typeof CATEGORIES)[number][0];

let pool: pg.Pool | undefined;
/**
 * Runs one query against the test database. Rows are `Record<string, unknown>` unless the caller
 * says what the query returns: sql<{ id: string }>("... RETURNING id").
 */
export function sql<Row extends QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []) {
  // allowExitOnIdle: let the worker process exit without an explicit pool.end().
  pool ??= new pg.Pool({ connectionString: testDatabaseUrl(), max: 2, allowExitOnIdle: true });
  return pool.query<Row>(text, params);
}

/** Removes every row from every table, then creates the three test accounts (email confirmed). */
export async function resetDatabase() {
  // Everything else references "user" or household, so CASCADE empties the whole schema.
  await sql(`TRUNCATE "user", household, verification CASCADE`);
  const hash = await hashPassword(PASSWORD);
  for (const user of Object.values(USERS)) {
    const id = randomUUID();
    await sql(`INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)`, [id, user.name, user.email]);
    await sql(`INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, 'credential', $2, $3)`, [
      randomUUID(),
      id,
      hash,
    ]);
  }
}

/**
 * Replaces all household data with one fresh household: owner, editor and viewer, and four
 * categories (Groceries €650 limit, Bills €380, Transport, Housing). Accounts and sign-in
 * sessions are kept. Returns { householdId, userIds: { owner, ... }, categoryIds: { Groceries, ... } }.
 */
export async function resetHousehold() {
  // Expenses first: their category link is ON DELETE RESTRICT.
  await sql("DELETE FROM expense");
  await sql("DELETE FROM household");
  const householdId = (await sql<{ id: string }>(`INSERT INTO household (name) VALUES ('Test Household') RETURNING id`)).rows[0].id;

  // Filled in by the loops below, one entry per role / category.
  const userIds = {} as Record<Role, string>;
  for (const [role, user] of Object.entries(USERS) as [Role, (typeof USERS)[Role]][]) {
    const { rows } = await sql<{ user_id: string }>(
      `INSERT INTO household_member (household_id, user_id, role) SELECT $1, id, $2 FROM "user" WHERE email = $3 RETURNING user_id`,
      [householdId, role, user.email],
    );
    userIds[role] = rows[0].user_id;
  }

  const categoryIds = {} as Record<CategoryName, string>;
  for (const [name, limit] of CATEGORIES) {
    const { rows } = await sql<{ id: string }>(
      "INSERT INTO category (household_id, name, monthly_limit) VALUES ($1, $2, $3) RETURNING id",
      [householdId, name, limit],
    );
    categoryIds[name] = rows[0].id;
  }
  return { householdId, userIds, categoryIds };
}

/** What resetHousehold returns: the household's id and the ids of its members and categories. */
export type TestHousehold = Awaited<ReturnType<typeof resetHousehold>>;
