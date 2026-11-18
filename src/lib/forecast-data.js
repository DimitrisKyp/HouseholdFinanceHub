// Loads everything the savings forecast needs, so the Goals and Insights pages show the same numbers.
import "server-only";
import {
  billsByCategory,
  firstExpenseDate,
  goalContributionsByMonth,
  listCategories,
  listGoals,
  listRecurringItems,
  monthlyNeeded,
  monthlySpending,
  recurringTotals,
  spendingBeyondBills,
} from "@/lib/finance";
import { forecastView, goalPace, LOOKBACK_MONTHS, monthStart, savingsForecast, typicalSpending } from "@/lib/forecast";

/**
 * The forecast panel's labels (null when there's nothing to forecast), plus the goals and each goal's
 * recent pace (Map of goalId → pace or null), which the Goals page reuses for its cards.
 */
export async function loadSavingsForecast(householdId, { today, timezone, currency }) {
  // The last few full months (not the current one, which is still in progress).
  const history = { from: monthStart(today, -LOOKBACK_MONTHS), to: monthStart(today) };
  const [goals, recurring, categories, spending, firstExpenseOn, contributions] = await Promise.all([
    listGoals(householdId, { timezone }),
    listRecurringItems(householdId),
    listCategories(householdId),
    monthlySpending(householdId, history),
    firstExpenseDate(householdId),
    goalContributionsByMonth(householdId, history),
  ]);

  const paces = new Map(
    goals.map(item => [item.id, goalPace({ createdOn: item.createdOn, byMonth: contributions.get(item.id) ?? new Map(), today })]),
  );

  // Fixed bills are already subtracted, so only spending (or planned spending) above them counts.
  const totals = recurringTotals(recurring);
  const bills = billsByCategory(recurring);
  const limitsTotal = spendingBeyondBills(
    categories.map(item => ({ categoryId: item.id, total: item.monthlyLimit ?? 0 })),
    bills,
  );
  const typical = typicalSpending({
    spending: spending.map(row => ({ ...row, beyondBills: spendingBeyondBills(row.byCategory, bills) })),
    firstExpenseOn,
    today,
    limitsTotal,
  });
  const needed = goals.map(item => monthlyNeeded(item, today)).filter(amount => amount !== null);

  const forecast = forecastView({
    forecast: savingsForecast({ income: totals.income, bills: totals.expenses, spending: typical }),
    income: totals.income,
    bills: totals.expenses,
    spending: typical,
    goalsNeeded: needed.length ? Math.round(needed.reduce((sum, amount) => sum + amount * 100, 0)) / 100 : null,
    goalList: goals.map(item => ({ ...item, pace: paces.get(item.id) })),
    currency,
  });
  return { forecast, goals, paces };
}
