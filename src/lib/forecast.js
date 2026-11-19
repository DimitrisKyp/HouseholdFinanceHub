// Savings forecast: what's likely left over each month, and when each goal will be reached at
// the household's recent pace. Pure functions on plain data ("YYYY-MM-DD" strings and numbers),
// so they're easy to unit-test. The queries that feed them live in lib/finance.js.
import { formatMoney } from "@/lib/format";
import { goalsTranslator } from "@/lib/goal-messages";

/** How many full months of history the forecast looks back over. */
export const LOOKBACK_MONTHS = 3;

/** How far ahead the forecast tiles look, in months. */
export const FORECAST_HORIZONS = [6, 12];

const pad = n => String(n).padStart(2, "0");
const cents = value => Math.round(value * 100) / 100;

/** The first day of the month `delta` months from `isoDate`'s month: monthStart("2026-11-18", -1) → "2026-10-01". */
export function monthStart(isoDate, delta = 0) {
  const [year, month] = isoDate.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
}

/** Whole calendar months from `fromIso`'s month to `toIso`'s month (negative if earlier). */
const monthsBetween = (fromIso, toIso) => {
  const [y1, m1] = fromIso.split("-").map(Number);
  const [y2, m2] = toIso.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

/**
 * Typical monthly day-to-day spending, from the last LOOKBACK_MONTHS full months, counting only
 * months since the first logged expense (so a new household isn't averaged with empty months).
 * Rows may carry `beyondBills` (spending not already covered by fixed bills), which is used if present.
 * Without a full month of history, the category limits are used as a plan, if there are any.
 * Returns { amount, basis: "history", months } | { amount, basis: "limits" } | { amount: null, basis: "none" }.
 */
export function typicalSpending({ spending, firstExpenseOn, today, limitsTotal = 0 }) {
  const firstMonth = firstExpenseOn ? monthStart(firstExpenseOn) : null;
  const spentByMonth = new Map(spending.map(row => [row.month, row.beyondBills ?? row.total]));
  const months = [];
  for (let back = 1; back <= LOOKBACK_MONTHS; back++) {
    const month = monthStart(today, -back);
    if (firstMonth && month >= firstMonth) months.push(month);
  }
  if (months.length) {
    const total = months.reduce((sum, month) => sum + (spentByMonth.get(month) ?? 0), 0);
    return { amount: cents(total / months.length), basis: "history", months: months.length };
  }
  if (limitsTotal > 0) return { amount: cents(limitsTotal), basis: "limits" };
  return { amount: null, basis: "none" };
}

/**
 * Expected amount left over each month (income − fixed bills − typical spending), and the running
 * total after each horizon. null when there's nothing to base it on (no budget or no spending basis).
 */
export function savingsForecast({ income, bills, spending }) {
  if (spending.basis === "none" || (income === 0 && bills === 0)) return null;
  const monthly = cents(income - bills - spending.amount);
  return {
    monthly,
    horizons: FORECAST_HORIZONS.map(months => ({ months, total: cents(monthly * months) })),
  };
}

/**
 * A goal's recent saving pace: net contributions per month over the last LOOKBACK_MONTHS full months,
 * counting only full months after the month it was created (so money that was already saved, added
 * when the goal was set up, isn't mistaken for a monthly habit).
 * byMonth: Map of "YYYY-MM-01" → net contributions that month. Returns { monthly, months } or null.
 */
export function goalPace({ createdOn, byMonth, today }) {
  const months = [];
  for (let back = 1; back <= LOOKBACK_MONTHS; back++) {
    const month = monthStart(today, -back);
    if (month > monthStart(createdOn)) months.push(month);
  }
  if (!months.length) return null;
  const total = months.reduce((sum, month) => sum + (byMonth.get(month) ?? 0), 0);
  return { monthly: cents(total / months.length), months: months.length };
}

/**
 * When a goal would be reached at its recent pace:
 *  { status: "new" }       less than one full month of history
 *  { status: "stalled" }   nothing (or less than nothing) added recently
 *  { status: "projected", reachMonth, monthsLate }  monthsLate is null without a target date,
 *                          0 when on track, otherwise how many months after the target month.
 */
export function goalProjection({ saved, targetAmount, targetDate, pace, today }) {
  if (!pace) return { status: "new" };
  if (pace.monthly <= 0) return { status: "stalled" };
  const remaining = Math.max(0, targetAmount - saved);
  const reachMonth = monthStart(today, Math.ceil(remaining / pace.monthly));
  const monthsLate = targetDate ? Math.max(0, monthsBetween(targetDate, reachMonth)) : null;
  return { status: "projected", reachMonth, monthsLate };
}

/**
 * What the open goals would hold after `months` at their recent pace. Each active goal grows by its
 * own pace but never past its target; paused goals stay as they are. Returns { later, monthly }
 * (monthly = the combined recent pace of the goals still growing), or null when no active goal
 * has a pace yet, so there's nothing to base it on.
 * goals: [{ status, saved, targetAmount, pace }] with pace from goalPace (or null).
 */
export function goalsOutlook(goals, months) {
  const open = goals.filter(goal => goal.status !== "completed");
  if (!open.some(goal => goal.status === "active" && goal.pace)) return null;
  let later = 0;
  let monthly = 0;
  for (const goal of open) {
    const growing = goal.status === "active" && goal.pace && goal.pace.monthly > 0 && goal.saved < goal.targetAmount;
    if (growing) monthly += goal.pace.monthly;
    later += growing ? Math.min(goal.targetAmount, goal.saved + goal.pace.monthly * months) : goal.saved;
  }
  return { later: cents(later), monthly: cents(monthly) };
}

/**
 * One "In N months" tile. With goals that have a recent pace, it shows what they'd realistically hold,
 * and what saving everything left over would add; otherwise the left-over total. A shortfall stays a shortfall.
 */
function horizonView(horizon, outlook, money, t) {
  if (horizon.total < 0) return { months: horizon.months, valueLabel: money(horizon.total), detail: t("forecast.shortfall") };
  if (!outlook) return { months: horizon.months, valueLabel: money(horizon.total), detail: t("forecast.allAside") };
  return {
    months: horizon.months,
    valueLabel: money(outlook.later),
    detail: t("forecast.inGoals", { pace: money(outlook.monthly), total: money(horizon.total) }),
  };
}

/**
 * Display labels for the forecast panel, or null when there's no forecast.
 * goalsNeeded: total a month the active goals with a target date need (null if there are none).
 * goalList: the goals with their pace (see goalsOutlook), for the "In N months" tiles.
 * locale: the UI language for the wording and amounts.
 */
export function forecastView({ forecast, income, bills, spending, goalsNeeded, currency, goalList = [], locale }) {
  if (!forecast) return null;
  const t = goalsTranslator(locale);
  const money = amount => formatMoney(amount, currency, locale);
  const spendingLabel = spending.basis === "history" ? t("forecast.typical") : t("forecast.planned");

  let goals = null;
  if (goalsNeeded !== null) {
    const spare = cents(forecast.monthly - goalsNeeded);
    goals = {
      neededLabel: money(goalsNeeded),
      verdict: spare >= 0 ? t("forecast.covered", { amount: money(spare) }) : t("forecast.moreThanLeft", { amount: money(-spare) }),
    };
  }

  return {
    monthlyLabel: money(forecast.monthly),
    monthlyNegative: forecast.monthly < 0,
    horizons: forecast.horizons.map(horizon =>
      horizonView(horizon, forecast.monthly < 0 ? null : goalsOutlook(goalList, horizon.months), money, t),
    ),
    breakdown: t("forecast.breakdown", {
      income: money(income),
      bills: money(bills),
      spendingLabel,
      spending: money(spending.amount),
      monthly: money(forecast.monthly),
    }),
    basisNote: spending.basis === "history" ? t("forecast.basisHistory", { count: spending.months }) : t("forecast.basisLimits"),
    goals,
  };
}
