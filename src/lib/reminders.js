// Reminder dates on plain data: when a bill is next due, how close a due date is, and which alert
// (if any) is owed today. No database or server-only imports, so it's unit-tested directly.
// Dates are "YYYY-MM-DD" strings in the household's timezone; "today" is passed in.

/** How many days before a due date the reminder can be sent (the form's choices). */
export const REMIND_DAY_CHOICES = [0, 1, 2, 3, 5, 7, 14];

/** Dashboard and "coming up": reminders due within this many days (and overdue ones). */
export const UPCOMING_DAYS = 7;

const toUtc = isoDate => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
const toIso = time => new Date(time).toISOString().slice(0, 10);
const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Whole days from a to b (negative if b is earlier). */
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

/** isoDate plus a number of days. */
export const addDays = (isoDate, days) => toIso(toUtc(isoDate) + days * 86_400_000);

/**
 * The n-th due date after the first one (n = 0 is the first). Monthly and yearly dates keep the
 * first date's day where the month has it, e.g. from 31 Jan: 28 Feb, 31 Mar, 30 Apr.
 */
export function occurrence(firstDue, frequency, n) {
  if (frequency === "weekly") return addDays(firstDue, 7 * n);
  const [year, month, day] = firstDue.split("-").map(Number);
  const months = frequency === "yearly" ? 12 * n : n;
  const targetYear = year + Math.floor((month - 1 + months) / 12);
  const targetMonth = (month - 1 + months) % 12;
  return toIso(Date.UTC(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth))));
}

/** The first due date after `paidThrough` (or the first one, if nothing is paid yet). null without a due date. */
export function nextDueDate({ dueOn, frequency, paidThrough = null }) {
  if (!dueOn) return null;
  if (!paidThrough || paidThrough < dueOn) return dueOn;
  // Jump close to the answer, then step: weekly bills paid years ahead stay cheap.
  const approxPeriods = frequency === "weekly" ? Math.floor(daysBetween(dueOn, paidThrough) / 7) : 0;
  for (let n = Math.max(0, approxPeriods - 1); n < approxPeriods + 2000; n += 1) {
    const date = occurrence(dueOn, frequency, n);
    if (date > paidThrough) return date;
  }
  return null;
}

/**
 * How a due date looks today: { status, days } with status "overdue" | "today" | "soon" | "later".
 * "soon" = within the reminder window or the next UPCOMING_DAYS days. days = days until it's due.
 */
export function dueStatus(dueDate, today, remindDaysBefore = 0) {
  const days = daysBetween(today, dueDate);
  if (days < 0) return { status: "overdue", days };
  if (days === 0) return { status: "today", days };
  if (days <= Math.max(remindDaysBefore, UPCOMING_DAYS)) return { status: "soon", days };
  return { status: "later", days };
}

/**
 * The alert owed today for a due date, or null: "upcoming" from `remindDaysBefore` days before
 * until the day before, "due" from the due date on. Each is sent once (see reminderDedupeKey), so
 * a day the daily job didn't run is caught up the next time.
 */
export function alertStage(dueDate, today, remindDaysBefore) {
  const days = daysBetween(today, dueDate);
  if (days <= 0) return "due";
  if (remindDaysBefore > 0 && days <= remindDaysBefore) return "upcoming";
  return null;
}

/** "reminder:bill:<id>:2026-12-01:due": one alert per item, due date and stage. */
export const reminderDedupeKey = (kind, id, dueDate, stage) => `reminder:${kind}:${id}:${dueDate}:${stage}`;

/** The start of every dedupe key for one item and due date (to mark its alerts read once it's done). */
export const reminderDedupePrefix = (kind, id, dueDate) => `reminder:${kind}:${id}:${dueDate}:`;

const STATUS_ORDER = { overdue: 0, today: 1, soon: 2, later: 3 };

/** Sorts reminders by due date (no date last), overdue first. Items: { dueDate, status }. */
export const byDueDate = (a, b) => {
  if (!a.dueDate || !b.dueDate) return a.dueDate ? -1 : b.dueDate ? 1 : 0;
  return a.dueDate.localeCompare(b.dueDate) || STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
};

/**
 * A due date as a badge: { tone, label } ("Overdue by 2 days", "Due today", "In 3 days", a date).
 * t: the "reminders" translator. null without a due date.
 */
export function reminderBadge({ status, days, dueDate }, t, formatDate) {
  if (!dueDate) return null;
  if (status === "overdue") return { tone: "danger", label: t("status.overdue", { count: -days }) };
  if (status === "today") return { tone: "warning", label: t("status.today") };
  if (days === 1) return { tone: "info", label: t("status.tomorrow") };
  if (status === "soon") return { tone: "info", label: t("status.inDays", { count: days }) };
  return { tone: "neutral", label: formatDate(dueDate) };
}
