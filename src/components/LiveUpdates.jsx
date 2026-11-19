"use client";

// Container: keeps every open page in step with the rest of the household (useLiveUpdates) and
// shows what changed (ToastStack). data-live also lets the browser tests wait for the connection.
import ToastStack from "@/components/Feedback/ToastStack";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { useLocale, useTranslations } from "@/i18n/client";
import { formatMoney } from "@/lib/format";

/** A message from the server ({ key, params }, see liveMessage in lib/live.js) in this reader's language. */
function messageText(message, t, locale) {
  if (typeof message === "string") return message;
  const { amount, currency, ...params } = message.params ?? {};
  if (typeof amount === "number") params.amount = formatMoney(amount, currency, locale);
  return t(`live.${message.key}`, params);
}

export default function LiveUpdates() {
  const { connected, toasts, dismiss } = useLiveUpdates();
  const t = useTranslations("common");
  const locale = useLocale();
  const shown = toasts.map(toast => ({ ...toast, message: messageText(toast.message, t, locale) }));
  return <ToastStack toasts={shown} onDismiss={dismiss} data-live={connected ? "open" : "connecting"} />;
}
