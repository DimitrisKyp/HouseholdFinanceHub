// Presentational: the notification centre's list. Each item opens through openNotificationAction
// (marks it read, then goes to what it's about), which works without JavaScript too.
// items: [{ id, type, title, body, readAt, whenLabel }]
import { openNotificationAction } from "@/lib/actions/notifications";

// A word next to each notification, so the kind never depends on colour alone.
const TYPE_LABELS = { budget: "Budget", goal: "Goal", member: "Members" };
const TYPE_STYLES = {
  budget: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  goal: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  member: "border-violet-400/30 bg-violet-400/10 text-violet-200",
};

export default function NotificationList({ items }) {
  return (
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
                  {item.readAt ? null : <span className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">New</span>}
                  <span className="text-xs text-slate-500">{item.whenLabel}</span>
                </span>
                <span className={`mt-1 block font-medium ${item.readAt ? "text-slate-300" : "text-white"}`}>{item.title}</span>
                {item.body ? <span className="mt-0.5 block text-sm text-slate-400">{item.body}</span> : null}
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
