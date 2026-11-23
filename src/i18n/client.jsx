"use client";

// Translations in Client Components. The messages come from the server through <Messages>
// (root layout: common and errors; each page adds its own namespaces).
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE } from "./config";
import { createTranslator } from "./translate";

const I18nContext = createContext(null);

// Component tests render without a provider; tests/setup.js supplies the English messages.
let fallback = null;
export function setFallbackMessages(locale, messages) {
  fallback = { locale, messages };
}

/** Provides messages to the components inside. Nested providers add to their parent's namespaces. */
export function I18nProvider({ locale, messages, children }) {
  const parent = useContext(I18nContext);
  const value = useMemo(
    () => ({ locale, messages: parent?.locale === locale ? { ...parent.messages, ...messages } : messages }),
    [parent, locale, messages],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

const useI18n = () => useContext(I18nContext) ?? fallback;

/** The current language: "en" or "el". */
export function useLocale() {
  return useI18n()?.locale ?? DEFAULT_LOCALE;
}

/** t(key, params) for one namespace. */
export function useTranslations(namespace) {
  const i18n = useI18n();
  return useMemo(() => createTranslator(i18n?.locale ?? DEFAULT_LOCALE, i18n?.messages, namespace), [i18n, namespace]);
}
