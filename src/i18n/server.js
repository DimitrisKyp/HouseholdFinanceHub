// The language to render in, and translations for Server Components, Server Actions and emails.
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "./config";
import { MESSAGES } from "./messages";
import { createTranslator } from "./translate";

const LOCALE_COOKIE = "locale";

/**
 * The visitor's language: the one they chose (cookie, set on the Account page and restored at
 * sign-in), otherwise their browser's preference. Outside a request it's the default.
 */
export const getLocale = cache(async () => {
  try {
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(chosen)) return chosen;
    return negotiateLocale((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** t(key, params) for one namespace, in the visitor's language or the given one. */
export async function getTranslations(namespace, locale) {
  const language = isLocale(locale) ? locale : await getLocale();
  return createTranslator(language, MESSAGES[language], namespace);
}

/** Remembers the language in this browser. Only callable from Server Actions. */
export async function rememberLocale(locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
}
