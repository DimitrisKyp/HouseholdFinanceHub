// Read queries for household finance data. Callers pass the householdId from the DAL
// (requireHousehold), so every query is scoped to the household the user belongs to.
// Pure calculations live in lib/calculations.js and are re-exported here for convenience.
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { GOAL_STATUSES, monthlyAmount } from "@/lib/calculations";
import { category, expense, goal, goalContribution, recurringItem, user } from "@/db/schema";

export {
  billsByCategory,
  categorySpending,
  FREQUENCIES,
  GOAL_STATUSES,
  goalView,
  monthlyAmount,
  monthlyNeeded,
  monthsUntil,
  recurringTotals,
  spendingBeyondBills,
} from "@/lib/calculations";

/** Categories in alphabetical order. Archived ones are only included when asked for. */
export async function listCategories(householdId, { includeArchived = false } = {}) {
  return db
    .select({ id: category.id, name: category.name, monthlyLimit: category.monthlyLimit, isArchived: category.isArchived })
    .from(category)
    .where(
      includeArchived ? eq(category.householdId, householdId) : and(eq(category.householdId, householdId), eq(category.isArchived, false)),
    )
    .orderBy(asc(category.name));
}

/** Active recurring income and expenses, largest first, with category and member names. */
export async function listRecurringItems(householdId) {
  const rows = await db
    .select({
      id: recurringItem.id,
      type: recurringItem.type,
      title: recurringItem.title,
      amount: recurringItem.amount,
      frequency: recurringItem.frequency,
      categoryId: recurringItem.categoryId,
      categoryName: category.name,
      memberName: user.name,
    })
    .from(recurringItem)
    .leftJoin(category, eq(category.id, recurringItem.categoryId))
    .leftJoin(user, eq(user.id, recurringItem.memberUserId))
    .where(and(eq(recurringItem.householdId, householdId), eq(recurringItem.isActive, true)))
    .orderBy(desc(recurringItem.amount), asc(recurringItem.title));
  return rows.map(row => ({ ...row, monthlyAmount: monthlyAmount(row) }));
}

// ── Goals ────────────────────────────────────────────────────────────────────

const CONTRIBUTIONS_SHOWN_PER_GOAL = 10;

/**
 * Goals with the amount saved so far (sum of contributions), the day they were created
 * ("YYYY-MM-DD" in the household timezone) and their latest contributions.
 * Active goals first, then paused, then completed; newest first within each.
 */
export async function listGoals(householdId, { timezone = "UTC" } = {}) {
  const saved = sql`coalesce(sum(${goalContribution.amount}), 0)`.mapWith(Number);
  const goals = await db
    .select({
      id: goal.id,
      name: goal.name,
      note: goal.note,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      status: goal.status,
      createdOn: sql`to_char(${goal.createdAt} at time zone ${timezone}, 'YYYY-MM-DD')`,
      saved,
    })
    .from(goal)
    .leftJoin(goalContribution, eq(goalContribution.goalId, goal.id))
    .where(and(eq(goal.householdId, householdId), inArray(goal.status, GOAL_STATUSES)))
    .groupBy(goal.id)
    .orderBy(sql`case ${goal.status} when 'active' then 0 when 'paused' then 1 else 2 end`, desc(goal.createdAt));
  if (!goals.length) return [];

  const contributions = await db
    .select({
      id: goalContribution.id,
      goalId: goalContribution.goalId,
      amount: goalContribution.amount,
      contributedOn: goalContribution.contributedOn,
      note: goalContribution.note,
      userName: user.name,
    })
    .from(goalContribution)
    .leftJoin(user, eq(user.id, goalContribution.userId))
    .where(
      inArray(
        goalContribution.goalId,
        goals.map(item => item.id),
      ),
    )
    .orderBy(desc(goalContribution.contributedOn), desc(goalContribution.createdAt));

  const byGoal = new Map();
  for (const item of contributions) {
    if (!byGoal.has(item.goalId)) byGoal.set(item.goalId, []);
    byGoal.get(item.goalId).push(item);
  }
  return goals.map(item => ({
    ...item,
    saved: Math.round(item.saved * 100) / 100,
    contributionCount: byGoal.get(item.id)?.length ?? 0,
    contributions: (byGoal.get(item.id) ?? []).slice(0, CONTRIBUTIONS_SHOWN_PER_GOAL),
  }));
}

/**
 * Net contributions per goal per month for contributed_on in [from, to):
 * Map of goalId → Map of "YYYY-MM-01" → amount (withdrawals count as negative).
 */
export async function goalContributionsByMonth(householdId, { from, to }) {
  const month = sql`to_char(date_trunc('month', ${goalContribution.contributedOn}), 'YYYY-MM-01')`;
  const rows = await db
    .select({ goalId: goalContribution.goalId, month, total: sql`sum(${goalContribution.amount})`.mapWith(Number) })
    .from(goalContribution)
    .innerJoin(goal, eq(goal.id, goalContribution.goalId))
    .where(and(eq(goal.householdId, householdId), gte(goalContribution.contributedOn, from), lt(goalContribution.contributedOn, to)))
    .groupBy(goalContribution.goalId, month);

  const byGoal = new Map();
  for (const row of rows) {
    if (!byGoal.has(row.goalId)) byGoal.set(row.goalId, new Map());
    byGoal.get(row.goalId).set(row.month, Math.round(row.total * 100) / 100);
  }
  return byGoal;
}

// ── Expenses ─────────────────────────────────────────────────────────────────

/** The date of the household's earliest expense ("YYYY-MM-DD"), or null if there are none. */
export async function firstExpenseDate(householdId) {
  const [row] = await db
    .select({ first: sql`min(${expense.spentOn})::text` })
    .from(expense)
    .where(eq(expense.householdId, householdId));
  return row?.first ?? null;
}

/** Expenses with spent_on in [from, to), newest first, with category and payer names. */
export async function listExpenses(householdId, { from, to }) {
  return db
    .select({
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      spentOn: expense.spentOn,
      categoryId: expense.categoryId,
      categoryName: category.name,
      paidByName: user.name,
    })
    .from(expense)
    .innerJoin(category, eq(category.id, expense.categoryId))
    .leftJoin(user, eq(user.id, expense.paidByUserId))
    .where(and(eq(expense.householdId, householdId), gte(expense.spentOn, from), lt(expense.spentOn, to)))
    .orderBy(desc(expense.spentOn), desc(expense.createdAt));
}

// ── Transactions (filtered, sorted, paginated expenses) ──────────────────────

export const TRANSACTIONS_PAGE_SIZE = 25;

const TRANSACTION_SORTS = {
  date: [expense.spentOn, expense.createdAt],
  amount: [expense.amount, expense.createdAt],
  title: [sql`lower(${expense.title})`, expense.spentOn],
  category: [sql`lower(${category.name})`, expense.spentOn],
};

/**
 * One page of expenses matching the filters, plus the count and total of ALL matches.
 * filters: { from, to (inclusive "YYYY-MM-DD" or null), categoryId, paidByUserId, q, sort, dir, page }
 */
export async function searchExpenses(householdId, filters) {
  const conditions = [eq(expense.householdId, householdId)];
  if (filters.from) conditions.push(gte(expense.spentOn, filters.from));
  if (filters.to) conditions.push(lte(expense.spentOn, filters.to));
  if (filters.categoryId) conditions.push(eq(expense.categoryId, filters.categoryId));
  if (filters.paidByUserId) conditions.push(eq(expense.paidByUserId, filters.paidByUserId));
  if (filters.q) {
    // Escape LIKE wildcards so "50%" matches literally.
    const pattern = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(ilike(expense.title, pattern));
  }
  const where = and(...conditions);

  const [summary] = await db
    .select({ count: sql`count(*)`.mapWith(Number), total: sql`coalesce(sum(${expense.amount}), 0)`.mapWith(Number) })
    .from(expense)
    .where(where);

  const direction = filters.dir === "asc" ? asc : desc;
  const rows = await db
    .select({
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      spentOn: expense.spentOn,
      categoryName: category.name,
      paidByName: user.name,
    })
    .from(expense)
    .innerJoin(category, eq(category.id, expense.categoryId))
    .leftJoin(user, eq(user.id, expense.paidByUserId))
    .where(where)
    .orderBy(...TRANSACTION_SORTS[filters.sort].map(column => direction(column)), desc(expense.id))
    .limit(TRANSACTIONS_PAGE_SIZE)
    .offset((filters.page - 1) * TRANSACTIONS_PAGE_SIZE);

  return { rows, count: summary.count, total: Math.round(summary.total * 100) / 100 };
}

// ── Insights (aggregates for charts) ─────────────────────────────────────────

/**
 * Spending per month for spent_on in [from, to): [{ month: "YYYY-MM-01", total, byCategory: [{ categoryId, total }] }].
 * Months without expenses are left out.
 */
export async function monthlySpending(householdId, { from, to }) {
  const month = sql`to_char(date_trunc('month', ${expense.spentOn}), 'YYYY-MM-01')`;
  const rows = await db
    .select({ month, categoryId: expense.categoryId, total: sql`sum(${expense.amount})`.mapWith(Number) })
    .from(expense)
    .where(and(eq(expense.householdId, householdId), gte(expense.spentOn, from), lt(expense.spentOn, to)))
    .groupBy(month, expense.categoryId);
  const months = new Map();
  for (const row of rows) {
    const entry = months.get(row.month) ?? { month: row.month, cents: 0, byCategory: [] };
    const total = Math.round(row.total * 100);
    entry.cents += total;
    entry.byCategory.push({ categoryId: row.categoryId, total: total / 100 });
    months.set(row.month, entry);
  }
  return [...months.values()].map(({ cents, ...entry }) => ({ ...entry, total: cents / 100 }));
}

/** Total spending per category for spent_on in [from, to), largest first. */
export async function spendingByCategory(householdId, { from, to }) {
  const total = sql`sum(${expense.amount})`.mapWith(Number);
  const rows = await db
    .select({ id: category.id, name: category.name, total })
    .from(expense)
    .innerJoin(category, eq(category.id, expense.categoryId))
    .where(and(eq(expense.householdId, householdId), gte(expense.spentOn, from), lt(expense.spentOn, to)))
    .groupBy(category.id, category.name)
    .orderBy(desc(total));
  return rows.map(row => ({ ...row, total: Math.round(row.total * 100) / 100 }));
}
