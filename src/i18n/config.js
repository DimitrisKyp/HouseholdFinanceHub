// The languages the app is translated into. Shared by server and client code.

export const LOCALES = ["en", "el"];
export const DEFAULT_LOCALE = "en";

/** Each language in its own language, for the language picker. */
export const LOCALE_NAMES = { en: "English", el: "Ελληνικά" };

/** Intl locale for dates and text in each language. */
const DATE_LOCALES = { en: "en-GB", el: "el-GR" };
/** Intl locale for amounts and numbers in each language ("€1,250.50" / "1.250,50 €"). */
const NUMBER_LOCALES = { en: "en-IE", el: "el-GR" };
/** Open Graph locale for share previews. */
export const OG_LOCALES = { en: "en_IE", el: "el_GR" };

export const isLocale = value => LOCALES.includes(value);

export const dateLocale = locale => DATE_LOCALES[locale] ?? DATE_LOCALES[DEFAULT_LOCALE];
export const numberLocale = locale => NUMBER_LOCALES[locale] ?? NUMBER_LOCALES[DEFAULT_LOCALE];

/**
 * The best supported language for an Accept-Language header, e.g. "el-GR,el;q=0.9,en;q=0.8" → "el".
 * Used for visitors who haven't chosen a language yet.
 */
export function negotiateLocale(acceptLanguage) {
  const preferred = String(acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map(p => p.trim()).find(p => p.startsWith("q="));
      return { language: tag.trim().toLowerCase().split("-")[0], quality: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter(entry => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return preferred.find(entry => isLocale(entry.language))?.language ?? DEFAULT_LOCALE;
}
