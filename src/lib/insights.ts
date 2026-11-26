// Calculations behind the Insights page. Pure functions on plain data ("YYYY-MM-DD" strings and
// numbers), so they're easy to unit-test and safe to import anywhere.

/** The periods the Insights page offers; their names are in the "insights" messages (ranges.<key>). */
import type { MonthSpending } from "@/lib/forecast";

export const INSIGHT_RANGES = [{ key: "6m" }, { key: "12m" }, { key: "ytd" }] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number]["key"];

/** A calendar month as its first and last day ("YYYY-MM-DD"). */
export type MonthBounds = { start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");
const addMonths = (year: number, month: number, delta: number): [year: number, month: number] => {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
};
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const cents = (value: number) => Math.round(value * 100) / 100;

/** The range key from the URL, or the default. */
export const parseInsightRange = (value: unknown): InsightRange => INSIGHT_RANGES.find(range => range.key === value)?.key ?? "6m";

/**
 * The months covered by a range, oldest first, ending with the current month:
 * [{ start: "2026-06-01", end: "2026-06-30" }, ...], plus the [from, to) bounds for queries.
 */
export function rangeMonths(rangeKey: string, today: string) {
  const [year, month] = today.split("-").map(Number);
  const count = rangeKey === "12m" ? 12 : rangeKey === "ytd" ? month : 6;
  const months: MonthBounds[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const [y, m] = addMonths(year, month, -offset);
    months.push({ start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDay(y, m))}` });
  }
  const [nextYear, nextMonth] = addMonths(year, month, 1);
  return { months, from: months[0].start, to: `${nextYear}-${pad(nextMonth)}-01` };
}

/**
 * One row per month: spending (from expenses) and the net result after the household's
 * recurring income and fixed bills. The Budget page holds the current amounts only, so the
 * same monthly baseline ({ income, bills }) is applied to every month. Spending rows may carry
 * `beyondBills` (the part not already covered by fixed bills), which is then used for the net.
 * The current month is marked as in progress.
 */
export function monthlySeries({
  months,
  spending,
  baseline,
  today,
}: {
  months: MonthBounds[];
  spending: MonthSpending[];
  baseline: { income: number; bills: number };
  today: string;
}) {
  const byMonth = new Map(spending.map(row => [row.month, row]));
  return months.map(month => {
    const row = byMonth.get(month.start);
    const spent = row?.total ?? 0;
    // Spending already covered by a fixed bill isn't subtracted twice (see spendingBeyondBills).
    const extra = row?.beyondBills ?? spent;
    return {
      month: month.start,
      spent,
      net: cents(baseline.income - baseline.bills - extra),
      current: today >= month.start && today <= month.end,
    };
  });
}

/**
 * The largest categories, with the rest folded into "Other", each with its share of the total.
 * otherName(count) names the folded row in the UI language.
 */
// Generic: whatever extra fields the rows have (T) are kept on the rows that aren't folded.
export function topCategories<T extends { id: string; name: string; total: number }>(
  rows: T[],
  limit = 7,
  otherName = (count: number) => `Other (${count})`,
) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const head = rows.slice(0, limit);
  const tail = rows.slice(limit);
  const list: (T | { id: string; name: string; total: number })[] = tail.length
    ? [...head, { id: "other", name: otherName(tail.length), total: cents(tail.reduce((s, r) => s + r.total, 0)) }]
    : head;
  return list.map(row => ({ ...row, share: total ? Math.round((row.total / total) * 100) : 0 }));
}

/**
 * Round axis ticks from 0 (or a negative minimum) to at least `max`.
 * Steps are 1, 2, 2.5 or 5 × a power of ten, so labels read cleanly.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  if (low === high) return [0, 1];
  const raw = (high - low) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  // 10 × power is always >= raw, so find() always finds one.
  const step = [1, 2, 2.5, 5, 10].map(f => f * power).find(s => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = Math.floor(low / step) * step; value < high + step; value += step) {
    ticks.push(Math.round(value * 100) / 100);
    if (value >= high) break;
  }
  return ticks;
}
