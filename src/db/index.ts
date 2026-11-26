// Database client for server code only (Server Components, Server Actions, Route Handlers).
// Importing this from a Client Component fails the build, so credentials never reach the browser.
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as typeof globalThis & { __dbPool?: Pool };

// Connections per server process. Keep it small on serverless hosting (e.g. 3 on Vercel), where many
// copies of the app can run at once and share the database's connection limit.
const poolMax = Number(process.env.DATABASE_POOL_MAX) || 10;

const pool = globalForDb.__dbPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: poolMax });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__dbPool = pool;
}

export const db = drizzle(pool, { schema });

export type Database = typeof db;
/** The `tx` handed to db.transaction(async tx => ...). */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Something queries can run on: the database itself, or an open transaction. */
export type DbExecutor = Database | Transaction;
