// Config for drizzle-kit (migrations, Drizzle Studio). Loads DATABASE_URL from .env.local
// the same way Next.js does.
import * as nextEnv from "@next/env";
import { defineConfig } from "drizzle-kit";

// @next/env is CommonJS: depending on the loader its exports appear directly or under `default`.
// Its types only describe the first case, so the second is added here.
const loadEnvConfig = nextEnv.loadEnvConfig ?? (nextEnv as typeof nextEnv & { default?: typeof nextEnv }).default?.loadEnvConfig;
if (!loadEnvConfig) throw new Error("@next/env has no loadEnvConfig");
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    // Only the commands that connect (migrate, studio, check) need it; they report an empty one.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
