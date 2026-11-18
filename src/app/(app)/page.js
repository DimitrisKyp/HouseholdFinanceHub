import ExpenseSection from "@/components/Dashboard/ExpenseSection";
import FinancialNewsPanel from "@/components/Dashboard/FinancialNewsPanel";
import GoalsRemindersPanel from "@/components/Dashboard/GoalsRemindersPanel";
import HeroSection from "@/components/Dashboard/HeroSection";
import TopBar from "@/components/TopBar";
import { requireHousehold } from "@/lib/dal";
import { categorySpending, goalView, listCategories, listExpenses, listGoals, listRecurringItems, recurringTotals } from "@/lib/finance";
import { currentMonthRange, formatDay, formatMoney, formatMonth, todayIn } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { MARKET_NEWS } from "@/lib/news";
import { can } from "@/lib/permissions";

const DASHBOARD_GOALS = 4;

export default async function DashboardPage() {
  const { user, householdId, householdName, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const money = amount => formatMoney(amount, currency);
  const today = todayIn(timezone);
  const month = currentMonthRange(timezone);

  const [recurring, categories, expenses, goals, members] = await Promise.all([
    listRecurringItems(householdId),
    listCategories(householdId),
    listExpenses(householdId, { from: month.start, to: month.end }),
    listGoals(householdId),
    canEdit ? listMembers(householdId) : [],
  ]);

  // This month: recurring income minus fixed bills minus what was actually spent.
  const totals = recurringTotals(recurring);
  const spent = Math.round(expenses.reduce((sum, item) => sum + item.amount * 100, 0)) / 100;
  const net = Math.round((totals.income - totals.expenses - spent) * 100) / 100;
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
    detail: [formatDay(item.spentOn), item.categoryName, item.paidByName].filter(Boolean).join(" · "),
  }));
  const goalRows = goals
    .filter(item => item.status === "active")
    .slice(0, DASHBOARD_GOALS)
    .map(item => goalView(item, { currency, today }));

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
  const monthLabel = formatMonth(month.start);

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex h-full w-full flex-col gap-4">
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

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="min-h-0 space-y-4">
            <ExpenseSection
              categories={categories.map(({ id, name }) => ({ id, name }))}
              members={members.map(({ userId, name }) => ({ userId, name }))}
              currentUserId={user.id}
              today={today}
              canEdit={canEdit}
              monthLabel={monthLabel}
              categoryTotals={categoryTotals}
              expenses={expenseRows}
            />
          </div>

          <div className="min-h-0 space-y-4">
            <GoalsRemindersPanel goals={goalRows} />
            <FinancialNewsPanel news={MARKET_NEWS} />
          </div>
        </section>
      </main>
    </div>
  );
}
