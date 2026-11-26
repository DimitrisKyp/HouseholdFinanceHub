// Budget and goal calculations on plain data. No database or server-only imports, so these can be
// used anywhere and unit-tested directly. The queries that feed them live in lib/finance.js.
import { goalProjection } from "@/lib/forecast";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { goalsTranslator } from "@/lib/goal-messages";
import type { AssetKind, Frequency, GoalStatus, RecurringType } from "@/db/schema";
import type { Translator } from "@/i18n/translate";
import type { GoalPace, GoalProjection } from "@/lib/forecast";

export const FREQUENCIES: Frequency[] = ["weekly", "monthly", "yearly"];

/** What an asset can be (the asset_kind enum). */
export const ASSET_KINDS: AssetKind[] = ["bank", "crypto", "stocks", "real_estate", "other"];

/** Net worth: the sum of what the household owns, to the cent. */
export const netWorth = (assets: { value: number }[]) => Math.round(assets.reduce((sum, item) => sum + item.value * 100, 0)) / 100;

// How many times per month something with this frequency happens, on average.
const PER_MONTH: Record<Frequency, number> = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

/** The average monthly amount of a recurring item, rounded to cents. */
export const monthlyAmount = ({ amount, frequency }: { amount: number; frequency: Frequency }) =>
  Math.round(amount * PER_MONTH[frequency] * 100) / 100;

/** Total monthly income and fixed expenses from the active recurring items. */
/** What the totals need from a recurring item (see finance.listRecurringItems). */
export type RecurringAmount = { type: RecurringType; categoryId: string | null; monthlyAmount: number };

export function recurringTotals(items: Pick<RecurringAmount, "type" | "monthlyAmount">[]) {
  const sum = (type: RecurringType) =>
    Math.round(items.filter(item => item.type === type).reduce((total, item) => total + item.monthlyAmount * 100, 0)) / 100;
  return { income: sum("income"), expenses: sum("expense") };
}

/** Monthly fixed bills per category id, for bills that have a category. */
export function billsByCategory(items: RecurringAmount[]): Map<string, number> {
  const bills = new Map<string, number>();
  for (const item of items) {
    if (item.type !== "expense" || !item.categoryId) continue;
    bills.set(item.categoryId, (bills.get(item.categoryId) ?? 0) + Math.round(item.monthlyAmount * 100));
  }
  return new Map([...bills].map(([id, amount]) => [id, amount / 100]));
}

/**
 * Spending on top of the fixed bills. Fixed bills are already subtracted from income, so in a
 * category that has fixed bills, only spending above them counts. Paying rent from the Budget
 * and also logging it as an expense then isn't counted twice, and logging it or not gives the
 * same result. rows: [{ categoryId, total }] (several rows per category are fine).
 */
export function spendingBeyondBills(rows: { categoryId: string; total: number }[], bills: Map<string, number>) {
  const spent = new Map<string, number>();
  for (const row of rows) spent.set(row.categoryId, (spent.get(row.categoryId) ?? 0) + Math.round(row.total * 100));
  let total = 0;
  for (const [id, amount] of spent) total += Math.max(0, amount - Math.round((bills.get(id) ?? 0) * 100));
  return total / 100;
}

export const GOAL_STATUSES: GoalStatus[] = ["active", "paused", "completed"];

/** Whole months from `today` until `targetDate` ("YYYY-MM-DD"), at least 1; null if no date or it has passed. */
export function monthsUntil(today: string, targetDate: string | null | undefined): number | null {
  if (!targetDate || targetDate < today) return null;
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = targetDate.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1);
  return Math.max(1, months);
}

/**
 * How much an active goal needs each month to reach its target by its target date (rounded up to
 * cents), or null if it has no future target date, is already reached, or isn't active.
 */
/** What monthlyNeeded needs from a goal. */
export type GoalAmounts = { targetDate: string | null; status: GoalStatus; saved: number; targetAmount: number };

export function monthlyNeeded(item: GoalAmounts, today: string): number | null {
  if (!item.targetDate || item.status !== "active" || item.saved >= item.targetAmount) return null;
  const months = monthsUntil(today, item.targetDate);
  return months === null ? null : Math.ceil(((item.targetAmount - item.saved) / months) * 100) / 100;
}

/** "At your recent pace (about €120 a month) you'd reach it in March 2027, in time for the target date." */
function projectionLabel(
  projection: GoalProjection,
  pace: GoalPace | null,
  money: (amount: number) => string,
  t: Translator,
  locale: string | null | undefined,
) {
  // goalProjection only returns something other than "new" when there is a pace.
  if (projection.status === "new" || !pace) return t("view.projectionNew");
  if (projection.status === "stalled") return t("view.stalled", { count: pace.months });
  const values = { amount: money(pace.monthly), month: formatMonth(projection.reachMonth, locale) };
  if (projection.monthsLate === null) return t("view.reach", values);
  if (projection.monthsLate === 0) return t("view.reachInTime", values);
  return t("view.reachLate", { ...values, count: projection.monthsLate });
}

/**
 * A goal with display labels (money in the household currency, dates, progress, plan and,
 * when `pace` is given (see lib/forecast.js goalPace), a projected date), in the UI language `locale`.
 */
/** A goal as listGoals (lib/finance.js) returns it. */
export type GoalViewInput = GoalAmounts & {
  id: string;
  name: string;
  note: string | null;
  contributionCount: number;
  contributions: { id: string; amount: number; contributedOn: string; userName: string | null; note: string | null }[];
};

export function goalView(
  item: GoalViewInput,
  { currency, today, pace, locale }: { currency: string; today: string; pace?: GoalPace | null; locale?: string | null },
) {
  const t = goalsTranslator(locale);
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const day = (isoDate: string) => formatDay(isoDate, locale ?? null);
  const remaining = Math.max(0, item.targetAmount - item.saved);
  const reached = item.saved >= item.targetAmount;

  let planLabel: string | null = null;
  const needed = monthlyNeeded(item, today);
  // monthlyNeeded is only non-null when there is a target date.
  if (needed !== null && item.targetDate) {
    planLabel = t("view.saveAbout", { amount: money(needed), date: day(item.targetDate) });
  } else if (item.targetDate && !reached && item.status === "active") {
    planLabel = t("view.datePassed", { date: day(item.targetDate), amount: money(remaining) });
  } else if (item.targetDate && !reached) {
    planLabel = t("view.targetDate", { date: day(item.targetDate) });
  }

  let forecastLabel: string | null = null;
  if (pace !== undefined && !reached && item.status === "active") {
    const projection = goalProjection({ saved: item.saved, targetAmount: item.targetAmount, targetDate: item.targetDate, pace, today });
    forecastLabel = projectionLabel(projection, pace ?? null, money, t, locale);
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
    forecastLabel,
    contributionCount: item.contributionCount,
    contributions: item.contributions.map(entry => ({
      id: entry.id,
      amount: entry.amount,
      amountLabel: `${entry.amount < 0 ? "−" : "+"}${money(Math.abs(entry.amount))}`,
      dayLabel: day(entry.contributedOn),
      userName: entry.userName,
      note: entry.note,
    })),
  };
}

/**
 * Spending per category for a list of expenses, against each category's monthly limit.
 * Includes every active category with a limit, plus any category that has spending.
 */
export function categorySpending(
  categories: { id: string; name: string; monthlyLimit: number | null }[],
  expenses: { categoryId: string; categoryName: string; amount: number }[],
) {
  const spent = new Map<string, number>();
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
