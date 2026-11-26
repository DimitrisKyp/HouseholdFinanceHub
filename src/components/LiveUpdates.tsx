"use client";

// Container: keeps every open page in step with the rest of the household (useLiveUpdates) and
// shows what changed (ToastStack). data-live also lets the browser tests wait for the connection.
import ToastStack from "@/components/Feedback/ToastStack";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { useLocale, useTranslations } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/translate";
import { formatMoney } from "@/lib/format";
import type { LiveMessage } from "@/lib/live";

/** A message from the server ({ key, params }, see liveMessage in lib/live.ts) in this reader's language. */
function messageText(message: LiveMessage | string, t: Translator, locale: Locale) {
  if (typeof message === "string") return message;
  // params come over the wire as unknown values: check their types before formatting.
  const { amount, currency, ...params } = message.params ?? {};
  if (typeof amount === "number") params.amount = formatMoney(amount, typeof currency === "string" ? currency : undefined, locale);
  return t(`live.${message.key}`, params);
}

export default function LiveUpdates() {
  const { connected, toasts, dismiss } = useLiveUpdates();
  const t = useTranslations("common");
  const locale = useLocale();
  const shown = toasts.map(toast => ({ ...toast, message: messageText(toast.message, t, locale) }));
  return <ToastStack toasts={shown} onDismiss={dismiss} data-live={connected ? "open" : "connecting"} />;
}
