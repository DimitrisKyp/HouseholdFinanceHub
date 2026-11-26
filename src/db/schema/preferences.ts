// Per-user settings that don't belong in Better Auth's own `user` table.
import { check, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth.js";

export const THEMES = ["system", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const userPreference = pgTable(
  "user_preference",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    // "system" follows the device; the theme is also kept in a cookie so every page renders in it.
    theme: varchar("theme", { length: 10 }).notNull().default("system"),
    // The UI language ("en", "el"); null follows the browser. Also kept in a cookie.
    locale: varchar("locale", { length: 5 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  t => [
    check("user_preference_theme_chk", sql`${t.theme} in ('system', 'dark', 'light')`),
    check("user_preference_locale_chk", sql`${t.locale} in ('en', 'el')`),
  ],
);

export type UserPreference = typeof userPreference.$inferSelect;
