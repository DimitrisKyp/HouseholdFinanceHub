// Better Auth configuration: email + password accounts stored in our own Postgres.
// Server-only: holds the database connection and the auth secret.
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { sendAccountExistsEmail, sendVerificationEmail } from "@/lib/email";

export const auth = betterAuth({
  // Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No session until the email is confirmed. Also makes sign-up hide whether an email is
    // already registered (it returns a fake user instead of an error).
    requireEmailVerification: true,
    // Tell the real owner of an email that someone tried to sign up with it.
    onExistingUserSignUp: async ({ user: existing }) => {
      await sendAccountExistsEmail({
        to: existing.email,
        name: existing.name,
        url: new URL("/sign-in", process.env.BETTER_AUTH_URL).toString(),
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user: recipient, url }) => {
      await sendVerificationEmail({ to: recipient.email, name: recipient.name, url });
    },
    sendOnSignUp: true,
    // Signing in before confirming sends a fresh link.
    sendOnSignIn: true,
    // Clicking the link logs the user in.
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // links work for 24 hours
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
