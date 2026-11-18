// Read queries for household finance data. Callers pass the householdId from the DAL
// (requireHousehold), so every query is scoped to the household the user belongs to.
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { formatDay, formatMoney } from "@/lib/format";
import { category, expense, goal, goalContribution, recurringItem, user } from "@/db/schema";

export const FREQUENCIES = ["weekly", "monthly", "yearly"];
export const FREQUENCY_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

// How many times per month something with this frequency happens, on average.
const PER_MONTH = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

/** The average monthly amount of a recurring item, rounded to cents. */
export const monthlyAmount = ({ amount, frequency }) => Math.round(amount * PER_MONTH[frequency] * 100) / 100;

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

/** Total monthly income and fixed expenses from the active recurring items. */
export function recurringTotals(items) {
  const sum = type =>
    Math.round(items.filter(item => item.type === type).reduce((total, item) => total + item.monthlyAmount * 100, 0)) / 100;
  return { income: sum("income"), expenses: sum("expense") };
}

// ── Goals ────────────────────────────────────────────────────────────────────

export const GOAL_STATUSES = ["active", "paused", "completed"];
const CONTRIBUTIONS_SHOWN_PER_GOAL = 10;

/**
 * Goals with the amount saved so far (sum of contributions) and their latest contributions.
 * Active goals first, then paused, then completed; newest first within each.
 */
export async function listGoals(householdId) {
  const saved = sql`coalesce(sum(${goalContribution.amount}), 0)`.mapWith(Number);
  const goals = await db
    .select({
      id: goal.id,
      name: goal.name,
      note: goal.note,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      status: goal.status,
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

/** Whole months from `today` until `targetDate` ("YYYY-MM-DD"), at least 1; null if no date or it has passed. */
export function monthsUntil(today, targetDate) {
  if (!targetDate || targetDate < today) return null;
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = targetDate.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1);
  return Math.max(1, months);
}

/** A goal with display labels (money in the household currency, dates, progress and plan). */
export function goalView(item, { currency, today }) {
  const money = amount => formatMoney(amount, currency);
  const remaining = Math.max(0, item.targetAmount - item.saved);
  const reached = item.saved >= item.targetAmount;

  let planLabel = null;
  if (item.targetDate && !reached && item.status === "active") {
    const months = monthsUntil(today, item.targetDate);
    planLabel =
      months === null
        ? `Target date ${formatDay(item.targetDate)} has passed; ${money(remaining)} still to go.`
        : `Save about ${money(Math.ceil((remaining / months) * 100) / 100)} a month to reach it by ${formatDay(item.targetDate)}.`;
  } else if (item.targetDate && !reached) {
    planLabel = `Target date ${formatDay(item.targetDate)}.`;
  }

  return {
    id: item.id,
    name: item.name,
    note: item.note,
    status: item.status,
    reached,
    percent: Math.min(100, Math.floor((item.saved / item.targetAmount) * 100)),
    savedLabel: money(item.saved),
    targetLabel: money(item.targetAmount),
    planLabel,
    contributionCount: item.contributionCount,
    contributions: item.contributions.map(entry => ({
      id: entry.id,
      amount: entry.amount,
      amountLabel: `${entry.amount < 0 ? "−" : "+"}${money(Math.abs(entry.amount))}`,
      dayLabel: formatDay(entry.contributedOn),
      userName: entry.userName,
      note: entry.note,
    })),
  };
}

// ── Expenses ─────────────────────────────────────────────────────────────────

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

/**
 * Spending per category for a list of expenses, against each category's monthly limit.
 * Includes every active category with a limit, plus any category that has spending.
 */
export function categorySpending(categories, expenses) {
  const spent = new Map();
  const names = new Map(categories.map(item => [item.id, item.name]));
  for (const item of expenses) {
    spent.set(item.categoryId, (spent.get(item.categoryId) ?? 0) + Math.round(item.amount * 100));
    if (!names.has(item.categoryId)) names.set(item.categoryId, item.categoryName);
  }
  const limits = new Map(categories.map(item => [item.id, item.monthlyLimit]));

  return [...names.entries()]
    .filter(([id]) => spent.has(id) || limits.get(id) != null)
    .map(([id, name]) => {
      const amount = (spent.get(id) ?? 0) / 100;
      const limit = limits.get(id) ?? null;
      return { id, name, spent: amount, limit, percent: limit ? Math.round((amount / limit) * 100) : null };
    })
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.spent - a.spent);
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
