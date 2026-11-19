// Goal and forecast wording for the pure functions in lib/forecast.js and lib/calculations.js.
// Only the "goals" messages are imported, so these modules stay small wherever they're used.
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import elGoals from "@/i18n/messages/el/goals.json";
import enGoals from "@/i18n/messages/en/goals.json";
import { createTranslator } from "@/i18n/translate";

const TABLES = { en: { goals: enGoals }, el: { goals: elGoals } };

/** t(key, params) for the "goals" messages in the given language (English if unknown). */
export function goalsTranslator(locale = DEFAULT_LOCALE) {
  const language = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return createTranslator(language, TABLES[language], "goals");
}
