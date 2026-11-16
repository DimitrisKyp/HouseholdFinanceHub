// Database client for server code only (Server Components, Server Actions, Route Handlers).
// Importing this from a Client Component fails the build, so credentials never reach the browser.
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis;

const pool = globalForDb.__dbPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
