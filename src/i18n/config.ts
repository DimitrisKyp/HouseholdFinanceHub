// The languages the app is translated into. Shared by server and client code.

export const LOCALES = ["en", "el"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Each language in its own language, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", el: "Ελληνικά" };

/** Intl locale for dates and text in each language. */
const DATE_LOCALES: Record<Locale, string> = { en: "en-GB", el: "el-GR" };
/** Intl locale for amounts and numbers in each language ("€1,250.50" / "1.250,50 €"). */
const NUMBER_LOCALES: Record<Locale, string> = { en: "en-IE", el: "el-GR" };
/** Open Graph locale for share previews. */
export const OG_LOCALES: Record<Locale, string> = { en: "en_IE", el: "el_GR" };

/** Type guard: narrows an unknown value (a cookie, a form field) to a supported Locale. */
export const isLocale = (value: unknown): value is Locale => (LOCALES as readonly unknown[]).includes(value);

export const dateLocale = (locale: string | null | undefined) => DATE_LOCALES[isLocale(locale) ? locale : DEFAULT_LOCALE];
export const numberLocale = (locale: string | null | undefined) => NUMBER_LOCALES[isLocale(locale) ? locale : DEFAULT_LOCALE];

/**
 * The best supported language for an Accept-Language header, e.g. "el-GR,el;q=0.9,en;q=0.8" → "el".
 * Used for visitors who haven't chosen a language yet.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const preferred = String(acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map(p => p.trim()).find(p => p.startsWith("q="));
      return { language: tag.trim().toLowerCase().split("-")[0], quality: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter(entry => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return preferred.map(entry => entry.language).find(isLocale) ?? DEFAULT_LOCALE;
}
