// Language links for the sign-in pages (no account needed). A plain form, so it works before
// any JavaScript has loaded.
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import { getLocale, getTranslations } from "@/i18n/server";
import { chooseLanguageAction } from "@/lib/actions/account";

export default async function LanguageSwitch() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  return (
    <form action={chooseLanguageAction} aria-label={t("language")} className="flex justify-center gap-1 text-xs">
      {LOCALES.map(value => (
        <button
          key={value}
          type="submit"
          name="locale"
          value={value}
          lang={value}
          aria-pressed={value === locale}
          className={`rounded-full px-3 py-1 transition ${
            value === locale ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
        >
          {LOCALE_NAMES[value]}
        </button>
      ))}
    </form>
  );
}
