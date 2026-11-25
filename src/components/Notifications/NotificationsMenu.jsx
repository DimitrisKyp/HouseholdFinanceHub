"use client";

// The bell on the dashboard: opens a pop-up with the latest notifications. The list is fetched
// each time it opens (and again when a new one arrives while it's open), so it's never stale.
// Opening a notification marks it read and goes to what it's about, if it's about a page.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import { useDismiss } from "@/hooks/useDismiss";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useTranslations } from "@/i18n/client";
import { markAllNotificationsReadAction, openNotificationAction } from "@/lib/actions/notifications";
import { signalUnreadChanged, UNREAD_CHANGED_EVENT } from "@/lib/unread-signal";

// A word next to each notification (types.*), so the kind never depends on colour alone.
const TYPE_TONES = { budget: "warning", goal: "success", member: "violet", reminder: "info" };

const BELL_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

function NotificationItem({ item, onOpen, disabled }) {
  const t = useTranslations("notifications");
  const kind = TYPE_TONES[item.type] ? item.type : "other";
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpen(item.id)}
        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-cyan-400/40 disabled:opacity-60 ${
          item.readAt ? "border-white/5 bg-white/[0.02]" : "border-cyan-400/20 bg-cyan-400/5"
        }`}
      >
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-cyan-300"}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONES[item.type] ?? "neutral"}>{t(`types.${kind}`)}</Badge>
            {item.readAt ? null : <span className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">{t("new")}</span>}
            <span className="text-xs text-slate-500">{item.whenLabel}</span>
          </span>
          <span className={`mt-1 block text-sm font-medium ${item.readAt ? "text-slate-300" : "text-white"}`}>{item.title}</span>
          {item.body ? <span className="mt-0.5 block text-xs text-slate-400">{item.body}</span> : null}
        </span>
      </button>
    </li>
  );
}

export default function NotificationsMenu({ unreadCount = 0 }) {
  const t = useTranslations("notifications");
  const common = useTranslations("common");
  const router = useRouter();
  const unread = useUnreadCount(unreadCount, "/");
  const [open, setOpen] = useState(false);
  // null while loading the first time; "error" if that failed.
  const [items, setItems] = useState(null);
  const [pending, startTransition] = useTransition();
  const wrapper = useRef(null);
  const panelId = useId();
  const headingId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, { containerRef: wrapper });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setItems((await response.json()).items);
    } catch {
      setItems(current => (Array.isArray(current) ? current : "error"));
    }
  }, []);

  // A fresh list each time it opens (see the bell's onClick), and again when a notification
  // arrives (or is read) while it's open.
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener(UNREAD_CHANGED_EVENT, load);
    return () => window.removeEventListener(UNREAD_CHANGED_EVENT, load);
  }, [open, load]);

  const openItem = id =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("notificationId", id);
      const { link } = await openNotificationAction(formData);
      signalUnreadChanged();
      if (link) {
        setOpen(false);
        router.push(link);
      }
    });

  const markAllRead = () =>
    startTransition(async () => {
      await markAllNotificationsReadAction();
      signalUnreadChanged();
    });

  const label = common("nav.alerts");
  const shownUnread = Array.isArray(items) ? items.filter(item => !item.readAt).length : unread;

  let body;
  if (items === null) body = <p className="px-1 py-3 text-sm text-slate-400">{t("loading")}</p>;
  else if (items === "error")
    body = (
      <p role="alert" className="px-1 py-3 text-sm text-rose-300">
        {t("loadFailed")}
      </p>
    );
  else if (!items.length) body = <p className="px-1 py-3 text-sm text-slate-400">{t("latest.empty")}</p>;
  else
    body = (
      <ul aria-label={t("metaTitle")} className="space-y-2">
        {items.map(item => (
          <NotificationItem key={item.id} item={item} onOpen={openItem} disabled={pending} />
        ))}
      </ul>
    );

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? common("nav.unreadLabel", { label, count: unread }) : label}
        title={unread > 0 ? common("nav.unreadTitle", { label, count: unread }) : label}
        onClick={() => {
          if (!open) load();
          setOpen(!open);
        }}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition hover:text-white ${
          open ? "border-cyan-400/40 text-white" : "border-white/10 text-slate-300 hover:border-cyan-400/40"
        }`}
      >
        {BELL_ICON}
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] leading-4 font-semibold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        // Phones: full width, just below the bell. Larger screens: under the bell.
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className="fixed inset-x-3 top-40 z-40 flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 id={headingId} className="text-sm font-semibold text-white">
                {t("metaTitle")}
              </h2>
              {Array.isArray(items) && items.length ? (
                <p className="text-xs text-slate-400">{shownUnread ? t("latest.unread", { count: shownUnread }) : t("latest.allRead")}</p>
              ) : null}
            </div>
            {shownUnread > 0 && Array.isArray(items) ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-60"
              >
                {pending ? t("marking") : t("markAllRead")}
              </button>
            ) : null}
          </div>
          <div className="min-h-0 overflow-y-auto p-3">{body}</div>
        </div>
      ) : null}
    </div>
  );
}
