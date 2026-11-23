// The user's theme and language, and the household currencies and timezones the settings form offers.
import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { THEMES, userPreference } from "@/db/schema";

export { THEMES };
const THEME_COOKIE = "theme";

/** The theme to render, from the cookie (so pages before sign-in use it too). */
export async function currentTheme() {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return THEMES.includes(value) ? value : "system";
}

/** Remembers the theme in this browser. Only callable from Server Actions. */
export async function rememberTheme(theme) {
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
}

export async function savedTheme(userId) {
  const [row] = await db.select({ theme: userPreference.theme }).from(userPreference).where(eq(userPreference.userId, userId));
  return row?.theme ?? null;
}

export async function saveTheme(userId, theme) {
  await db.insert(userPreference).values({ userId, theme }).onConflictDoUpdate({ target: userPreference.userId, set: { theme } });
}

/** The language the user chose ("en", "el"), or null if they never did. */
export async function savedLocale(userId) {
  const [row] = await db.select({ locale: userPreference.locale }).from(userPreference).where(eq(userPreference.userId, userId));
  return row?.locale ?? null;
}

export async function saveLocale(userId, locale) {
  await db.insert(userPreference).values({ userId, locale }).onConflictDoUpdate({ target: userPreference.userId, set: { locale } });
}

/** Currencies offered for a household (ISO 4217); amounts are always shown in this one currency. */
export const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "CAD", "AUD"];

/** Every IANA timezone the server knows, e.g. "Europe/Athens". */
export const timezones = () => Intl.supportedValuesOf("timeZone");
