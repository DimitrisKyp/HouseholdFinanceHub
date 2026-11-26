import { Suspense } from "react";
import ExpenseSection from "@/components/Dashboard/ExpenseSection";
import MarketPanel from "@/components/Dashboard/MarketPanel";
import MarketPanelSkeleton from "@/components/Dashboard/MarketPanelSkeleton";
import GoalsRemindersPanel from "@/components/Dashboard/GoalsRemindersPanel";
import HeroSection from "@/components/Dashboard/HeroSection";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { categorySpending, goalView, listCategories, listGoals, monthSummary } from "@/lib/finance";
import { expenseName, formatDay, formatMoney, formatMonth, NO_EXPENSE_TITLE, todayIn } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { upcomingReminders } from "@/lib/reminder-data";
import { reminderBadge } from "@/lib/reminders";

const DASHBOARD_GOALS = 4;

export default async function DashboardPage() {
  const { user, householdId, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const locale = await getLocale();
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const today = todayIn(timezone);

  // This month's numbers are shared with the top bar (see the layout), which shows what's left.
  const [{ month, recurring, expenses, totals, spent, net }, categories, goals, members, reminders, remindersT] = await Promise.all([
    monthSummary(householdId, timezone),
    listCategories(householdId),
    listGoals(householdId),
    canEdit ? listMembers(householdId) : [],
    upcomingReminders(householdId, today),
    getTranslations("reminders"),
  ]);
  const savingsRate = totals.income ? Math.max(0, Math.round((net / totals.income) * 100)) : 0;

  const categoryTotals = categorySpending(categories, expenses).map(item => ({
    ...item,
    spentLabel: money(item.spent),
    limitLabel: item.limit === null ? null : money(item.limit),
  }));
  const expenseRows = expenses.map(item => ({
    id: item.id,
    // Without a description the expense goes by its category, which then isn't repeated below it.
    title: expenseName(item.title, item.categoryName),
    amountLabel: money(item.amount),
    detail: [formatDay(item.spentOn, locale), item.title === NO_EXPENSE_TITLE ? null : item.categoryName, item.paidByName]
      .filter(Boolean)
      .join(" · "),
  }));
  const goalRows = goals
    .filter(item => item.status === "active")
    .slice(0, DASHBOARD_GOALS)
    .map(item => goalView(item, { currency, today, locale }));

  const reminderRows = reminders.map(item => ({
    key: `${item.kind}-${item.id}`,
    title: item.title,
    badge: reminderBadge(item, remindersT, (date: string) => formatDay(date, locale)),
    amountLabel: item.amount ? money(item.amount) : null,
  }));

  const monthLabel = formatMonth(month.start, locale);

  return (
    <Messages namespaces={["dashboard"]}>
      {/* From lg up the dashboard fits the screen: no page scroll, long lists scroll inside their
          panel. Smaller screens scroll the page as usual. */}
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6 lg:overflow-hidden">
        <main className="mx-auto flex w-full flex-col gap-4 lg:h-full">
          <HeroSection
            monthLabel={monthLabel}
            incomeLabel={money(totals.income)}
            spentLabel={money(spent)}
            billsLabel={money(totals.expenses)}
            netLabel={money(net)}
            savingsRate={savingsRate}
            incomeSourcesCount={recurring.filter(item => item.type === "income").length}
          />

          <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.4fr_0.9fr] lg:grid-rows-1">
            <div className="flex flex-col lg:min-h-0">
              <ExpenseSection
                categories={categories.map(({ id, name }) => ({ id, name }))}
                members={members.map(({ userId, name }) => ({ userId, name }))}
                currentUserId={user.id}
                today={today}
                canEdit={canEdit}
                monthLabel={monthLabel}
                categoryTotals={categoryTotals}
                expenses={expenseRows}
                currency={currency}
              />
            </div>

            <div className="flex flex-col gap-4 lg:min-h-0">
              <GoalsRemindersPanel goals={goalRows} reminders={reminderRows} />
              {/* Other services: streamed separately, so they never hold up the rest of the page. */}
              <Suspense fallback={<MarketPanelSkeleton />}>
                <MarketPanel currency={currency} timezone={timezone} />
              </Suspense>
            </div>
          </section>
        </main>
      </div>
    </Messages>
  );
}
