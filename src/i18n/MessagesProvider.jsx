// Server Component: sends the browser the messages for the given namespaces, so the Client
// Components inside can translate. Wrap a page's content in it, e.g.
// <Messages namespaces={["budget"]}>…</Messages>. The root layout already provides "common" and "errors".
import { I18nProvider } from "./client";
import { pickMessages } from "./messages";
import { getLocale } from "./server";

export default async function Messages({ namespaces, children }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, namespaces)}>
      {children}
    </I18nProvider>
  );
}
