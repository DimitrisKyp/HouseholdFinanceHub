// Wording and thresholds for in-app notifications. Pure functions, so they're easy to unit-test;
// lib/notifications.js decides when to send them and to whom.
//
// Each builder returns { title, body, data }. `data` holds the values the message is made of
// (names, amounts as numbers, the month as "YYYY-MM-01"); it's stored with the notification so
// renderNotification() can show it in each reader's language. title and body are the English
// text, kept as a fallback (and for notifications stored before `data` existed).
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import { createTranslator, type Translator } from "@/i18n/translate";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import type { AlertStage } from "@/lib/reminders";

/** The values stored with each kind of notification (its `data` column, without `kind`). */
type DataByKind = {
  budget: { categoryName: string; spent: number; limit: number; month: string; threshold: number; currency: string };
  goalReached: { goalName: string; saved: number; targetAmount: number; currency: string };
  memberJoined: { memberName: string; role: string; householdName: string };
  welcome: { householdName: string; role: string; inviterName: string | null };
  reminder: {
    item: "bill" | "task";
    title: string;
    dueDate: string;
    stage: AlertStage;
    days: number;
    overdue: boolean;
    amount: number | null;
    currency: string | null;
  };
  roleChanged: { role: string; householdName: string };
};
export type NotificationKind = keyof DataByKind;

/** A notification's `data` for one kind, e.g. NotificationDataOf<"budget">. */
export type NotificationDataOf<K extends NotificationKind> = { kind: K } & DataByKind[K];
/** Any notification's `data`: a discriminated union on `kind`. */
export type NotificationData = { [K in NotificationKind]: NotificationDataOf<K> }[NotificationKind];

type Rendered = { title: string; body: string };

/** Budget alerts go out when a category reaches these shares of its monthly limit (highest first). */
export const BUDGET_THRESHOLDS: number[] = [100, 80];

/** The highest threshold reached (100 or 80), or null. A limit of 0 means any spending is over it. */
export function budgetThreshold(spent: number, limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined || spent <= 0) return null;
  const percent = limit > 0 ? (spent / limit) * 100 : Infinity;
  return BUDGET_THRESHOLDS.find(threshold => percent >= threshold) ?? null;
}

/** "budget:<categoryId>:2026-11:80": one alert per category, month and threshold. */
export const budgetDedupeKey = (categoryId: string, month: string, threshold: number) =>
  `budget:${categoryId}:${month.slice(0, 7)}:${threshold}`;

const cents = (value: number) => Math.round(value * 100) / 100;

// Turns stored values into a title and body, per kind of notification. The mapped type makes
// each renderer receive exactly its own kind's data, and TypeScript checks every kind has one.
const RENDERERS: {
  [K in NotificationKind]: (data: DataByKind[K], t: Translator, locale: string, roles: (role: string) => string) => Rendered;
} = {
  budget({ categoryName, spent, limit, month, threshold, currency }, t, locale) {
    const money = (amount: number) => formatMoney(amount, currency, locale);
    const values = { category: categoryName, spent: money(spent), limit: money(limit), month: formatMonth(month, locale) };
    if (threshold === 100) {
      const over = cents(spent - limit);
      const variant = over > 0 ? "over" : "reached";
      return {
        title: t(`messages.budget.${variant}.title`, values),
        body: t(`messages.budget.${variant}.body`, { ...values, over: money(over) }),
      };
    }
    return {
      title: t("messages.budget.near.title", { ...values, percent: Math.floor((spent / limit) * 100) }),
      body: t("messages.budget.near.body", { ...values, left: money(cents(limit - spent)) }),
    };
  },
  goalReached({ goalName, saved, targetAmount, currency }, t, locale) {
    return {
      title: t("messages.goalReached.title", { goal: goalName }),
      body: t("messages.goalReached.body", {
        saved: formatMoney(saved, currency, locale),
        target: formatMoney(targetAmount, currency, locale),
      }),
    };
  },
  memberJoined({ memberName, role, householdName }, t, _locale, roles) {
    return {
      title: t("messages.memberJoined.title", { name: memberName, household: householdName }),
      body: t("messages.memberJoined.body", { role: roles(role) }),
    };
  },
  welcome({ householdName, role, inviterName }, t, _locale, roles) {
    return {
      title: t("messages.welcome.title", { household: householdName }),
      body: t(`messages.welcome.body.${role === "viewer" ? "viewer" : "editor"}`, {
        inviter: inviterName ?? t("messages.welcome.someone"),
        role: roles(role),
      }),
    };
  },
  // A bill to pay or a task to do. stage: "upcoming" (days before) or "due" (overdue if it was
  // already past its date when the alert went out).
  reminder({ item, title, dueDate, stage, days, overdue, amount, currency }, t, locale) {
    const date = formatDay(dueDate, locale);
    const variant = stage === "upcoming" ? "upcoming" : overdue ? "overdue" : "due";
    return {
      title: t(`messages.reminder.${variant}`, { title, count: days }),
      body:
        item === "bill"
          ? t("messages.reminder.billBody", { amount: formatMoney(amount, currency ?? undefined, locale), date })
          : t("messages.reminder.taskBody", { date }),
    };
  },
  roleChanged({ role, householdName }, t, _locale, roles) {
    const variant = role === "viewer" ? "viewer" : "editor";
    return {
      title: t(`messages.roleChanged.title.${variant}`, { role: roles(role), household: householdName }),
      body: t(`messages.roleChanged.body.${variant}`),
    };
  },
};

/**
 * A notification's title and body in the given language. Uses the stored values (`data`) when
 * there are any, otherwise the stored English title and body.
 */
export function renderNotification(
  { data, title, body }: { data: unknown; title: string; body: string | null },
  locale: string = DEFAULT_LOCALE,
): { title: string; body: string | null } {
  if (!isNotificationData(data)) return { title, body };
  return renderData(data, locale);
}

/** Stored `data` is plain JSON from the database: check it's one of ours before trusting it. */
function isNotificationData(data: unknown): data is NotificationData {
  return !!data && typeof data === "object" && "kind" in data && typeof data.kind === "string" && Object.hasOwn(RENDERERS, data.kind);
}

// Generic over the kind, so RENDERERS[data.kind] is known to accept this exact `data`.
function renderData<K extends NotificationKind>(data: NotificationDataOf<K>, locale: string): Rendered {
  const messages = MESSAGES[isLocale(locale) ? locale : DEFAULT_LOCALE];
  const t = createTranslator(locale, messages, "notifications");
  const common = createTranslator(locale, messages, "common");
  const render: (data: DataByKind[K], t: Translator, locale: string, roles: (role: string) => string) => Rendered = RENDERERS[data.kind];
  return render(data, t, locale, role => common(`roles.${role}`));
}

// The English text plus the values, ready to spread into notify().
const build = <K extends NotificationKind>(data: NotificationDataOf<K>) => ({ ...renderData(data, DEFAULT_LOCALE), data });

/** A budget alert. month: "YYYY-MM-01". */
export function budgetAlertMessage({ categoryName, spent, limit, month, threshold, currency }: DataByKind["budget"]) {
  return build({ kind: "budget", categoryName, spent, limit, month, threshold, currency });
}

export function goalReachedMessage({ goalName, saved, targetAmount, currency }: DataByKind["goalReached"]) {
  return build({ kind: "goalReached", goalName, saved, targetAmount, currency });
}

export function memberJoinedMessage({ memberName, role, householdName }: DataByKind["memberJoined"]) {
  return build({ kind: "memberJoined", memberName, role, householdName });
}

export function welcomeMessage({ householdName, role, inviterName }: DataByKind["welcome"]) {
  return build({ kind: "welcome", householdName, role, inviterName });
}

/** A reminder for a bill (with amount and currency) or a task. days: days until due, for "upcoming". */
export function reminderMessage({
  item,
  title,
  dueDate,
  stage,
  days = 0,
  overdue = false,
  amount = null,
  currency = null,
}: Pick<DataByKind["reminder"], "item" | "title" | "dueDate" | "stage"> & Partial<DataByKind["reminder"]>) {
  return build({ kind: "reminder", item, title, dueDate, stage, days, overdue, amount, currency });
}

export function roleChangedMessage({ role, householdName }: DataByKind["roleChanged"]) {
  return build({ kind: "roleChanged", role, householdName });
}
