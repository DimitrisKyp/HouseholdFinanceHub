import Panel from "@/components/Panel";
import MarkAllReadButton from "@/components/Notifications/MarkAllReadButton";
import { openNotificationAction } from "@/lib/actions/notifications";
import { requireHousehold } from "@/lib/dal";
import { listNotifications, NOTIFICATIONS_SHOWN } from "@/lib/notifications";

export const metadata = { title: "Notifications · Household Finance Hub" };

// A word next to each notification, so the kind never depends on colour alone.
const TYPE_LABELS = { budget: "Budget", goal: "Goal", member: "Members" };
const TYPE_STYLES = {
  budget: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  goal: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  member: "border-violet-400/30 bg-violet-400/10 text-violet-200",
};

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
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id}>
                  <form action={openNotificationAction}>
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button
                      type="submit"
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-cyan-400/40 ${
                        item.readAt ? "border-white/5 bg-white/[0.02]" : "border-cyan-400/20 bg-cyan-400/5"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-cyan-300"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                              TYPE_STYLES[item.type] ?? "border-white/10 text-slate-300"
                            }`}
                          >
                            {TYPE_LABELS[item.type] ?? "Update"}
                          </span>
                          {item.readAt ? null : (
                            <span className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">New</span>
                          )}
                          <span className="text-xs text-slate-500">{formatWhen(item.createdAt)}</span>
                        </span>
                        <span className={`mt-1 block font-medium ${item.readAt ? "text-slate-300" : "text-white"}`}>{item.title}</span>
                        {item.body ? <span className="mt-0.5 block text-sm text-slate-400">{item.body}</span> : null}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
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
