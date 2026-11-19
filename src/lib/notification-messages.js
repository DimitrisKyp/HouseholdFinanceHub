// Wording and thresholds for in-app notifications. Pure functions, so they're easy to unit-test;
// lib/notifications.js decides when to send them and to whom.
//
// Each builder returns { title, body, data }. `data` holds the values the message is made of
// (names, amounts as numbers, the month as "YYYY-MM-01"); it's stored with the notification so
// renderNotification() can show it in each reader's language. title and body are the English
// text, kept as a fallback (and for notifications stored before `data` existed).
import { DEFAULT_LOCALE } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translate";
import { formatMoney, formatMonth } from "@/lib/format";

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

const cents = value => Math.round(value * 100) / 100;

// Turns stored values into a title and body, per kind of notification.
const RENDERERS = {
  budget({ categoryName, spent, limit, month, threshold, currency }, t, locale) {
    const money = amount => formatMoney(amount, currency, locale);
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
export function renderNotification({ data, title, body }, locale = DEFAULT_LOCALE) {
  const render = data && RENDERERS[data.kind];
  if (!render) return { title, body };
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const t = createTranslator(locale, messages, "notifications");
  const common = createTranslator(locale, messages, "common");
  return render(data, t, locale, role => common(`roles.${role}`));
}

// The English text plus the values, ready to spread into notify().
const build = data => ({ ...renderNotification({ data }, DEFAULT_LOCALE), data });

/** A budget alert. month: "YYYY-MM-01". */
export function budgetAlertMessage({ categoryName, spent, limit, month, threshold, currency }) {
  return build({ kind: "budget", categoryName, spent, limit, month, threshold, currency });
}

export function goalReachedMessage({ goalName, saved, targetAmount, currency }) {
  return build({ kind: "goalReached", goalName, saved, targetAmount, currency });
}

export function memberJoinedMessage({ memberName, role, householdName }) {
  return build({ kind: "memberJoined", memberName, role, householdName });
}

export function welcomeMessage({ householdName, role, inviterName }) {
  return build({ kind: "welcome", householdName, role, inviterName });
}

export function roleChangedMessage({ role, householdName }) {
  return build({ kind: "roleChanged", role, householdName });
}
