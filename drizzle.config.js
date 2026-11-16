// Config for drizzle-kit (migrations, Drizzle Studio). Loads DATABASE_URL from .env.local
// the same way Next.js does.
import * as nextEnv from "@next/env";
import { defineConfig } from "drizzle-kit";

// @next/env is CommonJS: depending on the loader its exports appear directly or under `default`.
(nextEnv.loadEnvConfig ?? nextEnv.default.loadEnvConfig)(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
