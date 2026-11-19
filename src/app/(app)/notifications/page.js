import Panel from "@/components/Panel";
import MarkAllReadButton from "@/components/Notifications/MarkAllReadButton";
import NotificationList from "@/components/Notifications/NotificationList";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { renderNotification } from "@/lib/notification-messages";
import { listNotifications, NOTIFICATIONS_SHOWN } from "@/lib/notifications";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("notifications"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

export default async function NotificationsPage() {
  const { user, householdId, timezone } = await requireHousehold();
  const [items, locale, t] = await Promise.all([listNotifications(user.id, householdId), getLocale(), getTranslations("notifications")]);
  const unread = items.filter(item => !item.readAt).length;

  // Times in the household's timezone; the year only when it isn't this year.
  const intlLocale = dateLocale(locale);
  const thisYear = new Intl.DateTimeFormat(intlLocale, { year: "numeric", timeZone: timezone }).format(new Date());
  const formatWhen = date => {
    const sameYear = new Intl.DateTimeFormat(intlLocale, { year: "numeric", timeZone: timezone }).format(date) === thisYear;
    return new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  };

  // Each notification in the reader's language, whatever language it was created in.
  const shown = items.map(({ data, ...item }) => ({
    ...item,
    ...renderNotification({ data, title: item.title, body: item.body }, locale),
    whenLabel: formatWhen(item.createdAt),
  }));

  return (
    <Messages namespaces={["notifications"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("intro")}</p>
              </div>
              {unread ? <MarkAllReadButton /> : null}
            </div>
          </section>

          <Panel
            title={t("latest.title")}
            subtitle={
              items.length
                ? `${unread ? t("latest.unread", { count: unread }) : t("latest.allRead")} ${t("latest.hint", { shown: NOTIFICATIONS_SHOWN })}`
                : t("latest.nothingYet")
            }
          >
            {items.length ? <NotificationList items={shown} /> : <p className="text-sm text-slate-400">{t("latest.empty")}</p>}
          </Panel>
        </main>
      </div>
    </Messages>
  );
}
