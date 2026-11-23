"use client";

import { useFormStatus } from "react-dom";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { signalUnreadChanged } from "@/lib/unread-signal";
import { useTranslations } from "@/i18n/client";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("notifications");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-60"
    >
      {pending ? t("marking") : t("markAllRead")}
    </button>
  );
}

export default function MarkAllReadButton() {
  return (
    <form
      action={async () => {
        await markAllNotificationsReadAction();
        signalUnreadChanged();
      }}
    >
      <SubmitButton />
    </form>
  );
}
