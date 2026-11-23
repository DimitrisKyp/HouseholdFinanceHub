// Calculations behind the Insights page. Pure functions on plain data ("YYYY-MM-DD" strings and
// numbers), so they're easy to unit-test and safe to import anywhere.

/** The periods the Insights page offers; their names are in the "insights" messages (ranges.<key>). */
export const INSIGHT_RANGES = [{ key: "6m" }, { key: "12m" }, { key: "ytd" }];

const pad = n => String(n).padStart(2, "0");
const addMonths = (year, month, delta) => {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
};
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const cents = value => Math.round(value * 100) / 100;

/** The range key from the URL, or the default. */
export const parseInsightRange = value => (INSIGHT_RANGES.some(range => range.key === value) ? value : "6m");

/**
 * The months covered by a range, oldest first, ending with the current month:
 * [{ start: "2026-06-01", end: "2026-06-30" }, ...], plus the [from, to) bounds for queries.
 */
export function rangeMonths(rangeKey, today) {
  const [year, month] = today.split("-").map(Number);
  const count = rangeKey === "12m" ? 12 : rangeKey === "ytd" ? month : 6;
  const months = [];
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
export function monthlySeries({ months, spending, baseline, today }) {
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
export function topCategories(rows, limit = 7, otherName = count => `Other (${count})`) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const head = rows.slice(0, limit);
  const tail = rows.slice(limit);
  const list = tail.length
    ? [...head, { id: "other", name: otherName(tail.length), total: cents(tail.reduce((s, r) => s + r.total, 0)) }]
    : head;
  return list.map(row => ({ ...row, share: total ? Math.round((row.total / total) * 100) : 0 }));
}

/**
 * Round axis ticks from 0 (or a negative minimum) to at least `max`.
 * Steps are 1, 2, 2.5 or 5 × a power of ten, so labels read cleanly.
 */
export function niceTicks(min, max, target = 4) {
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  if (low === high) return [0, 1];
  const raw = (high - low) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * power).find(s => s >= raw);
  const ticks = [];
  for (let value = Math.floor(low / step) * step; value < high + step; value += step) {
    ticks.push(Math.round(value * 100) / 100);
    if (value >= high) break;
  }
  return ticks;
}
