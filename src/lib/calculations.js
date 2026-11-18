// Budget and goal calculations on plain data. No database or server-only imports, so these can be
// used anywhere and unit-tested directly. The queries that feed them live in lib/finance.js.
import { formatDay, formatMoney } from "@/lib/format";

export const FREQUENCIES = ["weekly", "monthly", "yearly"];

export const FREQUENCY_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

// How many times per month something with this frequency happens, on average.
const PER_MONTH = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

/** The average monthly amount of a recurring item, rounded to cents. */
export const monthlyAmount = ({ amount, frequency }) => Math.round(amount * PER_MONTH[frequency] * 100) / 100;

/** Total monthly income and fixed expenses from the active recurring items. */
export function recurringTotals(items) {
  const sum = type =>
    Math.round(items.filter(item => item.type === type).reduce((total, item) => total + item.monthlyAmount * 100, 0)) / 100;
  return { income: sum("income"), expenses: sum("expense") };
}

export const GOAL_STATUSES = ["active", "paused", "completed"];

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
