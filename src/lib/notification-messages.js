// Wording and thresholds for in-app notifications. Pure functions, so they're easy to unit-test;
// lib/notifications.js decides when to send them and to whom.
import { formatMoney, formatMonth } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

/** Budget alerts go out when a category reaches these shares of its monthly limit (highest first). */
export const BUDGET_THRESHOLDS = [100, 80];

/** The highest threshold reached (100 or 80), or null. A limit of 0 means any spending is over it. */
export function budgetThreshold(spent, limit) {
  if (limit === null || limit === undefined || spent <= 0) return null;
  const percent = limit > 0 ? (spent / limit) * 100 : Infinity;
  return BUDGET_THRESHOLDS.find(threshold => percent >= threshold) ?? null;
}

/** "budget:<categoryId>:2026-11:80": one alert per category, month and threshold. */
export const budgetDedupeKey = (categoryId, month, threshold) => `budget:${categoryId}:${month.slice(0, 7)}:${threshold}`;

/** Title and body for a budget alert. month: "YYYY-MM-01". */
export function budgetAlertMessage({ categoryName, spent, limit, month, threshold, currency }) {
  const money = amount => formatMoney(amount, currency);
  const period = formatMonth(month);
  if (threshold === 100) {
    const over = Math.round((spent - limit) * 100) / 100;
    return {
      title: over > 0 ? `${categoryName} is over budget` : `${categoryName} has reached its budget`,
      body:
        over > 0
          ? `${money(spent)} spent of ${money(limit)} in ${period}: ${money(over)} over.`
          : `${money(spent)} spent of ${money(limit)} in ${period}.`,
    };
  }
  return {
    title: `${categoryName} is at ${Math.floor((spent / limit) * 100)}% of its budget`,
    body: `${money(spent)} spent of ${money(limit)} in ${period}, ${money(Math.round((limit - spent) * 100) / 100)} left.`,
  };
}

export function goalReachedMessage({ goalName, saved, targetAmount, currency }) {
  return {
    title: `Goal reached: ${goalName}`,
    body: `${formatMoney(saved, currency)} saved of ${formatMoney(targetAmount, currency)}. Mark it as completed on the Goals page when you're ready.`,
  };
}

export function memberJoinedMessage({ memberName, role, householdName }) {
  return {
    title: `${memberName} joined ${householdName}`,
    body: `They accepted the invitation and joined as ${ROLE_LABELS[role]}.`,
  };
}

export function welcomeMessage({ householdName, role, inviterName }) {
  return {
    title: `Welcome to ${householdName}`,
    body: `${inviterName} invited you as ${ROLE_LABELS[role]}. ${role === "viewer" ? "You can see everything but can't make changes." : "You can add expenses and update budgets and goals."}`,
  };
}

export function roleChangedMessage({ role, householdName }) {
  return {
    title: `You're now ${role === "editor" ? "an" : "a"} ${ROLE_LABELS[role]} in ${householdName}`,
    body:
      role === "viewer"
        ? "You can still see everything, but can no longer add or change anything."
        : "You can now add expenses and update budgets and goals.",
  };
}
