// Reminder dates on plain data: when a bill is next due, how close a due date is, and which alert
// (if any) is owed today. No database or server-only imports, so it's unit-tested directly.
// Dates are "YYYY-MM-DD" strings in the household's timezone; "today" is passed in.
import type { Frequency, TaskKind, TaskRepeat } from "@/db/schema";
import type { Translator } from "@/i18n/translate";

/** How many days before a due date the reminder can be sent (the form's choices). */
export const REMIND_DAY_CHOICES = [0, 1, 2, 3, 5, 7, 14];

/** What a task can be about (the filters on the Reminders page; "bills" also shows bill reminders). */
export const TASK_KINDS: TaskKind[] = [
  "vehicle",
  "documents",
  "subscriptions",
  "warranties",
  "bills",
  "returns",
  "prescriptions",
  "free_trials",
  "other",
];

/** How often a task can repeat (null = once). */
export const TASK_REPEATS: TaskRepeat[] = ["daily", "weekly", "monthly", "yearly"];

/** How often something comes back: a bill's frequency or a task's repeat. */
export type RepeatFrequency = Frequency | TaskRepeat;

/** How a due date looks today. */
export type DueStatus = "overdue" | "today" | "soon" | "later";

/** Which alert is owed: a heads-up before the date, or "due" from the date on. */
export type AlertStage = "upcoming" | "due";

/** Dashboard and "coming up": reminders due within this many days (and overdue ones). */
export const UPCOMING_DAYS = 7;

const toUtc = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);
const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Whole days from a to b (negative if b is earlier). */
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

/** isoDate plus a number of days. */
export const addDays = (isoDate: string, days: number) => toIso(toUtc(isoDate) + days * 86_400_000);

/**
 * The n-th due date after the first one (n = 0 is the first). Monthly and yearly dates keep the
 * first date's day where the month has it, e.g. from 31 Jan: 28 Feb, 31 Mar, 30 Apr.
 */
export function occurrence(firstDue: string, frequency: RepeatFrequency, n: number): string {
  if (frequency === "daily") return addDays(firstDue, n);
  if (frequency === "weekly") return addDays(firstDue, 7 * n);
  const [year, month, day] = firstDue.split("-").map(Number);
  const months = frequency === "yearly" ? 12 * n : n;
  const targetYear = year + Math.floor((month - 1 + months) / 12);
  const targetMonth = (month - 1 + months) % 12;
  return toIso(Date.UTC(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth))));
}

/** The first due date after `paidThrough` (or the first one, if nothing is paid yet). null without a due date. */
const PERIOD_DAYS: Partial<Record<RepeatFrequency, number>> = { daily: 1, weekly: 7 };

export function nextDueDate({
  dueOn,
  frequency,
  paidThrough = null,
}: {
  dueOn: string | null;
  frequency: RepeatFrequency;
  paidThrough?: string | null;
}): string | null {
  if (!dueOn) return null;
  if (!paidThrough || paidThrough < dueOn) return dueOn;
  // Jump close to the answer, then step: daily and weekly dates years ahead stay cheap.
  const periodDays = PERIOD_DAYS[frequency];
  const approxPeriods = periodDays ? Math.floor(daysBetween(dueOn, paidThrough) / periodDays) : 0;
  for (let n = Math.max(0, approxPeriods - 1); n < approxPeriods + 2000; n += 1) {
    const date = occurrence(dueOn, frequency, n);
    if (date > paidThrough) return date;
  }
  return null;
}

/**
 * A repeating task's next due date once it's done: the first one after its current due date, or
 * after today if it was done late (a daily task done three days late is next due tomorrow).
 */
export function nextRepeatDate(dueOn: string, repeat: TaskRepeat, today: string): string {
  const next = nextDueDate({ dueOn, frequency: repeat, paidThrough: dueOn > today ? dueOn : today });
  // nextDueDate only gives null without a due date or for dates thousands of periods ahead; neither happens here.
  if (!next) throw new Error(`No next date for a ${repeat} task due ${dueOn}`);
  return next;
}

/**
 * How a due date looks today: { status, days } with status "overdue" | "today" | "soon" | "later".
 * "soon" = within the reminder window or the next UPCOMING_DAYS days. days = days until it's due.
 */
export function dueStatus(dueDate: string, today: string, remindDaysBefore = 0): { status: DueStatus; days: number } {
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
export function alertStage(dueDate: string, today: string, remindDaysBefore: number): AlertStage | null {
  const days = daysBetween(today, dueDate);
  if (days <= 0) return "due";
  if (remindDaysBefore > 0 && days <= remindDaysBefore) return "upcoming";
  return null;
}

/** "reminder:bill:<id>:2026-12-01:due": one alert per item, due date and stage. */
export const reminderDedupeKey = (kind: string, id: string, dueDate: string, stage: AlertStage) =>
  `reminder:${kind}:${id}:${dueDate}:${stage}`;

/** The start of every dedupe key for one item and due date (to mark its alerts read once it's done). */
export const reminderDedupePrefix = (kind: string, id: string, dueDate: string) => `reminder:${kind}:${id}:${dueDate}:`;

/** What sorting and badges need: a due date and its status (both null when there is no date). */
export type DueInfo = { dueDate: string | null; status: DueStatus | null };

const STATUS_ORDER: Record<DueStatus, number> = { overdue: 0, today: 1, soon: 2, later: 3 };

/** Sorts reminders by due date (no date last), overdue first. Items: { dueDate, status }. */
export const byDueDate = (a: DueInfo, b: DueInfo) => {
  if (!a.dueDate || !b.dueDate) return a.dueDate ? -1 : b.dueDate ? 1 : 0;
  // status is always set when dueDate is (see dueStatus).
  return a.dueDate.localeCompare(b.dueDate) || STATUS_ORDER[a.status ?? "later"] - STATUS_ORDER[b.status ?? "later"];
};

/**
 * A due date as a badge: { tone, label } ("Overdue by 2 days", "Due today", "In 3 days", a date).
 * t: the "reminders" translator. null without a due date.
 */
export type BadgeTone = "danger" | "warning" | "info" | "neutral";

export function reminderBadge(
  { status, days, dueDate }: DueInfo & { days: number | null },
  t: Translator,
  formatDate: (isoDate: string) => string,
): { tone: BadgeTone; label: string } | null {
  if (!dueDate) return null;
  if (status === "overdue") return { tone: "danger", label: t("status.overdue", { count: -(days ?? 0) }) };
  if (status === "today") return { tone: "warning", label: t("status.today") };
  if (days === 1) return { tone: "info", label: t("status.tomorrow") };
  if (status === "soon") return { tone: "info", label: t("status.inDays", { count: days }) };
  return { tone: "neutral", label: formatDate(dueDate) };
}
