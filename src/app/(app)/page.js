import { Suspense } from "react";
import ExpenseSection from "@/components/Dashboard/ExpenseSection";
import MarketPanel from "@/components/Dashboard/MarketPanel";
import MarketPanelSkeleton from "@/components/Dashboard/MarketPanelSkeleton";
import GoalsRemindersPanel from "@/components/Dashboard/GoalsRemindersPanel";
import HeroSection from "@/components/Dashboard/HeroSection";
import TopBar from "@/components/TopBar";
import { dateLocale } from "@/i18n/config";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import {
  billsByCategory,
  categorySpending,
  goalView,
  listCategories,
  listExpenses,
  listGoals,
  listRecurringItems,
  recurringTotals,
  spendingBeyondBills,
} from "@/lib/finance";
import { currentMonthRange, formatDay, formatMoney, formatMonth, todayIn } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { upcomingReminders } from "@/lib/reminder-data";
import { reminderBadge } from "@/lib/reminders";

const DASHBOARD_GOALS = 4;

export default async function DashboardPage() {
  const { user, householdId, householdName, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const locale = await getLocale();
  const money = amount => formatMoney(amount, currency, locale);
  const today = todayIn(timezone);
  const month = currentMonthRange(timezone);

  const [recurring, categories, expenses, goals, members, reminders, remindersT] = await Promise.all([
    listRecurringItems(householdId),
    listCategories(householdId),
    listExpenses(householdId, { from: month.start, to: month.end }),
    listGoals(householdId),
    canEdit ? listMembers(householdId) : [],
    upcomingReminders(householdId, today),
    getTranslations("reminders"),
  ]);

  // This month: recurring income minus fixed bills minus what was spent on top of them (expenses
  // in a bill's category only count above that bill, so a bill logged as an expense isn't counted twice).
  const totals = recurringTotals(recurring);
  const spent = Math.round(expenses.reduce((sum, item) => sum + item.amount * 100, 0)) / 100;
  const extra = spendingBeyondBills(
    expenses.map(item => ({ categoryId: item.categoryId, total: item.amount })),
    billsByCategory(recurring),
  );
  const net = Math.round((totals.income - totals.expenses - extra) * 100) / 100;
  const savingsRate = totals.income ? Math.max(0, Math.round((net / totals.income) * 100)) : 0;

  const categoryTotals = categorySpending(categories, expenses).map(item => ({
    ...item,
    spentLabel: money(item.spent),
    limitLabel: item.limit === null ? null : money(item.limit),
  }));
  const expenseRows = expenses.map(item => ({
    id: item.id,
    title: item.title,
    amountLabel: money(item.amount),
    detail: [formatDay(item.spentOn, locale), item.categoryName, item.paidByName].filter(Boolean).join(" · "),
  }));
  const goalRows = goals
    .filter(item => item.status === "active")
    .slice(0, DASHBOARD_GOALS)
    .map(item => goalView(item, { currency, today, locale }));

  const reminderRows = reminders.map(item => ({
    key: `${item.kind}-${item.id}`,
    title: item.title,
    badge: reminderBadge(item, remindersT, date => formatDay(date, locale)),
    amountLabel: item.kind === "bill" ? money(item.amount) : null,
  }));

  const dateLabel = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
  const monthLabel = formatMonth(month.start, locale);

  return (
    <Messages namespaces={["dashboard"]}>
      {/* From lg up the dashboard fits the screen: no page scroll, long lists scroll inside their
          panel. Smaller screens scroll the page as usual. */}
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6 lg:overflow-hidden">
        <main className="mx-auto flex w-full flex-col gap-4 lg:h-full">
          <TopBar
            balanceLabel={money(net)}
            balanceNegative={net < 0}
            dateLabel={dateLabel}
            currentUser={{ name: user.name, avatarUrl: user.image ?? null, role, householdName }}
          />
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
