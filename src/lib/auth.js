// Better Auth configuration: email + password accounts stored in our own Postgres.
// Server-only: holds the database connection and the auth secret.
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";

export const auth = betterAuth({
  // Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Turn on once outgoing email is set up (later step).
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      jobTitle: { type: "string", required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // extend the session at most once a day
  },
  // Lets Server Actions set the login cookie. Must stay the last plugin.
  plugins: [nextCookies()],
});
