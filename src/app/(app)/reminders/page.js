import Link from "next/link";
import Panel from "@/components/Panel";
import BillReminderList from "@/components/Reminders/BillReminderList";
import TaskPanel from "@/components/Reminders/TaskPanel";
import { buttonClasses } from "@/components/ui/Button";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { formatDay, formatMoney, todayIn } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listAssignableMembers, listBillReminders, listTasks } from "@/lib/reminder-data";
import { reminderBadge } from "@/lib/reminders";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("reminders"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

export default async function RemindersPage() {
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
  const openTasks = tasks.open.map(item => ({
    id: item.id,
    title: item.title,
    badge: reminderBadge(item, t, day),
    detail: [item.dueDate ? null : t("tasks.noDate"), item.assigneeName ?? t("everyone")].filter(Boolean).join(" · "),
  }));
  const doneTasks = tasks.done.map(item => ({
    id: item.id,
    title: item.title,
    detail: item.doneByName ? t("tasks.doneBy", { name: item.doneByName }) : null,
  }));

  return (
    <Messages namespaces={["reminders"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
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

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title={t("tasks.title")} subtitle={t("tasks.subtitle")}>
              <TaskPanel open={openTasks} done={doneTasks} members={members} canEdit={canEdit} />
            </Panel>
            <Panel title={t("bills.title")} subtitle={t("bills.subtitle")}>
              {billRows.length ? (
                <BillReminderList bills={billRows} members={members} canEdit={canEdit} today={today} />
              ) : (
                <p className="text-sm text-slate-400">
                  {t("bills.empty")}{" "}
                  <Link href="/budget" className="text-cyan-300 underline-offset-2 hover:underline">
                    {t("bills.emptyLink")}
                  </Link>
                </p>
              )}
            </Panel>
          </div>
        </main>
      </div>
    </Messages>
  );
}
