import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { getTranslations } from "@/i18n/server";
import type { goalView } from "@/lib/calculations";
import type { reminderBadge } from "@/lib/reminders";

/** A goal's progress, as goalView returns it (only these fields are shown here). */
export type GoalSummaryItem = Pick<ReturnType<typeof goalView>, "id" | "name" | "savedLabel" | "targetLabel" | "percent">;
/** A bill or task due soon, with its due-date badge (null without a due date). */
export type ReminderSummaryItem = {
  key: string;
  title: string;
  badge: ReturnType<typeof reminderBadge>;
  amountLabel: string | null;
};

type GoalsRemindersPanelProps = {
  goals: GoalSummaryItem[];
  reminders?: ReminderSummaryItem[];
};

const smallLink =
  "shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white";

// Bills and tasks due this week (or overdue), then the goals' progress. Both lists scroll together
// inside the panel when the dashboard fills the screen.
export default async function GoalsRemindersPanel({ goals, reminders = [] }: GoalsRemindersPanelProps) {
  const [t, r] = await Promise.all([getTranslations("dashboard"), getTranslations("reminders")]);
  return (
    <section className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10 backdrop-blur lg:max-h-[50%] lg:min-h-0 lg:shrink-0">
      <div
        role="region"
        aria-label={`${r("dashboard.title")}, ${t("goals.title")}`}
        tabIndex={0}
        className="relative -m-1 min-h-0 space-y-5 overflow-y-auto rounded-lg p-1"
      >
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">{r("dashboard.title")}</h2>
            <Link href="/reminders" className={smallLink}>
              {r("dashboard.all")} →
            </Link>
          </div>
          {reminders.length ? (
            <ul aria-label={r("dashboard.title")} className="space-y-2">
              {reminders.map(item => (
                <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-slate-300">{item.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {item.amountLabel ? <span className="text-slate-400">{item.amountLabel}</span> : null}
                    {item.badge ? <Badge tone={item.badge.tone}>{item.badge.label}</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{r("dashboard.empty")}</p>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">{t("goals.title")}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{t("goals.subtitle")}</p>
            </div>
            <Link href="/goals" className={smallLink}>
              {t("goals.manage")}
            </Link>
          </div>
          {goals.length ? (
            <ul aria-label={t("goals.title")} className="space-y-3">
              {goals.map(goal => (
                <li key={goal.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-300">{goal.name}</span>
                    <span className="shrink-0 text-slate-400">
                      {goal.savedLabel} / {goal.targetLabel} · {goal.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                      style={{ width: `${goal.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t("goals.empty")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
