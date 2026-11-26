// Every translated message, by language and namespace (one JSON file per area of the app).
// Server-side only: pages send the browser just the namespaces their client components use
// (see i18n/MessagesProvider.tsx).
import elAccount from "./el/account.json";
import elAuth from "./el/auth.json";
import elBudget from "./el/budget.json";
import elCommon from "./el/common.json";
import elDashboard from "./el/dashboard.json";
import elEmail from "./el/email.json";
import elErrors from "./el/errors.json";
import elGoals from "./el/goals.json";
import elInsights from "./el/insights.json";
import elMembers from "./el/members.json";
import elNotifications from "./el/notifications.json";
import elReminders from "./el/reminders.json";
import elTransactions from "./el/transactions.json";
import enAccount from "./en/account.json";
import enAuth from "./en/auth.json";
import enBudget from "./en/budget.json";
import enCommon from "./en/common.json";
import enDashboard from "./en/dashboard.json";
import enEmail from "./en/email.json";
import enErrors from "./en/errors.json";
import enGoals from "./en/goals.json";
import enInsights from "./en/insights.json";
import enMembers from "./en/members.json";
import enNotifications from "./en/notifications.json";
import enReminders from "./en/reminders.json";
import enTransactions from "./en/transactions.json";

import type { Locale } from "../config";

export const MESSAGES = {
  en: {
    account: enAccount,
    auth: enAuth,
    budget: enBudget,
    common: enCommon,
    dashboard: enDashboard,
    email: enEmail,
    errors: enErrors,
    goals: enGoals,
    insights: enInsights,
    members: enMembers,
    notifications: enNotifications,
    reminders: enReminders,
    transactions: enTransactions,
  },
  el: {
    account: elAccount,
    auth: elAuth,
    budget: elBudget,
    common: elCommon,
    dashboard: elDashboard,
    email: elEmail,
    errors: elErrors,
    goals: elGoals,
    insights: elInsights,
    members: elMembers,
    notifications: elNotifications,
    reminders: elReminders,
    transactions: elTransactions,
  },
};

/** A message namespace (one JSON file), e.g. "budget". */
export type Namespace = keyof (typeof MESSAGES)["en"];

/** Only the given namespaces, for sending to the browser. */
export function pickMessages(locale: Locale, namespaces: readonly Namespace[]) {
  return Object.fromEntries(namespaces.map(namespace => [namespace, MESSAGES[locale][namespace]]));
}
