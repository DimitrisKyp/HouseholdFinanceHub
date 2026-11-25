import Link from "next/link";
import Panel from "@/components/Panel";
import TaskPanel, { AddTaskForm } from "@/components/Reminders/TaskPanel";
import { buttonClasses } from "@/components/ui/Button";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { formatDay, formatMoney, todayIn } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listAssignableMembers, listBillReminders, listTasks } from "@/lib/reminder-data";
import { reminderBadge, TASK_KINDS } from "@/lib/reminders";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("reminders"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

const FILTERS = [null, ...TASK_KINDS];
const filterHref = kind => (kind ? `/reminders?kind=${kind}` : "/reminders");

/** Filter chips: All, then each kind of task. "Bills" also shows the bill reminders. */
function ReminderFilters({ active, t }) {
  return (
    <nav aria-label={t("filters.label")} className="flex flex-wrap gap-2">
      {FILTERS.map(kind => {
        const current = kind === active;
        return (
          <Link
            key={kind ?? "all"}
            href={filterHref(kind)}
            aria-current={current ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              current
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                : "border-white/10 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {kind ? t(`kinds.${kind}`) : t("filters.all")}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function RemindersPage({ searchParams }) {
  const { kind } = await searchParams;
  const filter = TASK_KINDS.includes(kind) ? kind : null;
  const showBills = !filter || filter === "bills";
  const { householdId, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const today = todayIn(timezone);
  const [locale, t, budget] = await Promise.all([getLocale(), getTranslations("reminders"), getTranslations("budget")]);
  const day = date => formatDay(date, locale);

  const [bills, tasks, members] = await Promise.all([
    listBillReminders(householdId, today),
    listTasks(householdId, today),
    canEdit ? listAssignableMembers(householdId) : [],
  ]);

  // Labels are built here, in the household's currency and the reader's language.
  const billRows = bills.map(item => ({
    type: "bill",
    id: item.id,
    title: item.title,
    amountLabel: formatMoney(item.amount, currency, locale),
    detail: [budget(`recurring.frequencies.${item.frequency}`), item.categoryName].filter(Boolean).join(" · "),
    dueDate: item.dueDate,
    dueLabel: item.dueDate ? t("bills.nextDue", { date: day(item.dueDate) }) : null,
    badge: reminderBadge(item, t, day),
    payerUserId: item.payerUserId ?? "",
    payerLabel: item.dueDate && item.payerName ? t("bills.paysLabel", { name: item.payerName }) : null,
    remindDaysBefore: item.remindDaysBefore,
    canLog: Boolean(item.categoryId),
  }));
  // "Bills" shows the recurring bills and the tasks with an amount or of that type.
  const matches = item => !filter || item.kind === filter || (filter === "bills" && item.amount);
  const taskRows = tasks.open.filter(matches).map(item => ({
    type: "task",
    id: item.id,
    title: item.title,
    dueDate: item.dueDate,
    kindLabel: t(`kinds.${item.kind}`),
    amountLabel: item.amount ? formatMoney(item.amount, currency, locale) : null,
    badge: reminderBadge(item, t, day),
    detail: [item.repeat ? t(`repeats.${item.repeat}`) : null, item.dueDate ? null : t("tasks.noDate"), item.assigneeName ?? t("everyone")]
      .filter(Boolean)
      .join(" · "),
  }));
  // One list, soonest first; anything without a date goes last.
  const listRows = [...(showBills ? billRows : []), ...taskRows].sort((x, y) => {
    if (x.dueDate && y.dueDate) return x.dueDate.localeCompare(y.dueDate);
    if (x.dueDate) return -1;
    return y.dueDate ? 1 : 0;
  });
  const doneTasks = tasks.done.filter(matches).map(item => ({
    id: item.id,
    title: item.title,
    detail: item.doneByName ? t("tasks.doneBy", { name: item.doneByName }) : null,
  }));

  return (
    <Messages namespaces={["reminders"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">{t("heading")}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{canEdit ? t("introEdit") : t("introView")}</p>
              </div>
              <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit shrink-0" })}>
                {t("backToDashboard")}
              </Link>
            </div>
          </section>

          {/* Left: the form for a new reminder. Right: what's active, with the filters applying only there. */}
          <div
            className={`grid items-start gap-4 ${canEdit ? "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]" : ""}`}
          >
            {canEdit ? (
              <Panel title={t("tasks.newTitle")} subtitle={t("tasks.subtitle")} className="lg:sticky lg:top-0">
                <AddTaskForm members={members} />
              </Panel>
            ) : null}

            <div className="flex min-w-0 flex-col gap-4">
              <ReminderFilters active={filter} t={t} />
              <Panel title={t("list.title")} subtitle={t("list.subtitle")}>
                <TaskPanel
                  items={listRows}
                  done={doneTasks}
                  members={members}
                  canEdit={canEdit}
                  today={today}
                  emptyText={filter ? t("tasks.emptyFiltered", { kind: t(`kinds.${filter}`) }) : t("tasks.empty")}
                />
                {showBills && !billRows.length ? (
                  <p className="mt-4 text-xs text-slate-400">
                    {t("bills.empty")}{" "}
                    <Link href="/categories" className="text-cyan-300 underline-offset-2 hover:underline">
                      {t("bills.emptyLink")}
                    </Link>
                  </p>
                ) : null}
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </Messages>
  );
}
