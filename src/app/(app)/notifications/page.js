import Panel from "@/components/Panel";
import MarkAllReadButton from "@/components/Notifications/MarkAllReadButton";
import NotificationList from "@/components/Notifications/NotificationList";
import { requireHousehold } from "@/lib/dal";
import { listNotifications, NOTIFICATIONS_SHOWN } from "@/lib/notifications";

export const metadata = { title: "Notifications · Household Finance Hub" };

export default async function NotificationsPage() {
  const { user, householdId, timezone } = await requireHousehold();
  const items = await listNotifications(user.id, householdId);
  const unread = items.filter(item => !item.readAt).length;

  // Times in the household's timezone; the year only when it isn't this year.
  const thisYear = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: timezone }).format(new Date());
  const formatWhen = date => {
    const sameYear = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: timezone }).format(date) === thisYear;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  };

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">Notifications</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">What needs your attention.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Budget alerts at 80% and 100% of a category&apos;s monthly limit, goals that reach their target, and changes to who&apos;s
                in the household.
              </p>
            </div>
            {unread ? <MarkAllReadButton /> : null}
          </div>
        </section>

        <Panel
          title="Latest"
          subtitle={
            items.length
              ? `${unread ? `${unread} unread. ` : "All read. "}Open one to see what it's about. The latest ${NOTIFICATIONS_SHOWN} are kept here.`
              : "Nothing yet."
          }
        >
          {items.length ? (
            <NotificationList items={items.map(item => ({ ...item, whenLabel: formatWhen(item.createdAt) }))} />
          ) : (
            <p className="text-sm text-slate-400">
              You&apos;ll get one when a category nears its monthly limit, a goal reaches its target, or someone joins the household.
            </p>
          )}
        </Panel>
      </main>
    </div>
  );
}
