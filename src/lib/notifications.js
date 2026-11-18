// In-app notifications: who gets them, when, and the queries behind the notification centre.
// Each notification belongs to one user in one household. A dedupe key (unique per user) stops
// the same alert from being sent twice, e.g. "Groceries reached 80%" once per month.
import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, expense, householdMember, notification } from "@/db/schema";
import { monthStart } from "@/lib/forecast";
import { publish } from "@/lib/live";
import { budgetAlertMessage, budgetDedupeKey, budgetThreshold } from "@/lib/notification-messages";

/** How many notifications the notification centre shows. */
export const NOTIFICATIONS_SHOWN = 50;

/**
 * Sends one notification to each user. executor: db or a transaction. Users who already have a
 * notification with the same dedupeKey are skipped. Returns true if anything was sent.
 */
export async function notify(executor, { householdId, userIds, type, title, body = null, link = null, dedupeKey = null }) {
  if (!userIds.length) return false;
  const sent = await executor
    .insert(notification)
    .values(userIds.map(userId => ({ householdId, userId, type, title, body, link, dedupeKey })))
    .onConflictDoNothing()
    .returning({ id: notification.id });
  if (!sent.length) return false;
  // Updates the unread badge of the people who got one (after the transaction commits, if in one).
  await publish({ householdId, kind: "notifications", userIds: [...new Set(userIds)] }, executor);
  return true;
}

/** User ids of the household's members, optionally only some roles. */
export async function memberIds(executor, householdId, { roles } = {}) {
  const rows = await executor
    .select({ userId: householdMember.userId, role: householdMember.role })
    .from(householdMember)
    .where(eq(householdMember.householdId, householdId));
  return rows.filter(row => !roles || roles.includes(row.role)).map(row => row.userId);
}

/**
 * After an expense is added: if its category has now reached 80% or 100% of its monthly limit,
 * tell every member (once per category, month and threshold). Only for the current month:
 * a back-dated expense doesn't raise an alert about a month that's over. Returns true if one was sent.
 */
export async function checkBudgetAlert({ householdId, categoryId, spentOn, today, currency }) {
  const month = monthStart(today);
  if (monthStart(spentOn) !== month) return false;

  const [found] = await db
    .select({ name: category.name, limit: category.monthlyLimit })
    .from(category)
    .where(and(eq(category.id, categoryId), eq(category.householdId, householdId)));
  if (!found || found.limit === null) return false;

  const [{ spent }] = await db
    .select({ spent: sql`coalesce(sum(${expense.amount}), 0)`.mapWith(Number) })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.categoryId, categoryId),
        gte(expense.spentOn, month),
        lt(expense.spentOn, monthStart(today, 1)),
      ),
    );
  const threshold = budgetThreshold(spent, found.limit);
  if (!threshold) return false;

  if (threshold < 100) {
    // Already told it's over budget this month (e.g. an expense was deleted since): don't step back to 80%.
    const [over] = await db
      .select({ id: notification.id })
      .from(notification)
      .where(and(eq(notification.householdId, householdId), eq(notification.dedupeKey, budgetDedupeKey(categoryId, month, 100))))
      .limit(1);
    if (over) return false;
  }

  const message = budgetAlertMessage({
    categoryName: found.name,
    spent: Math.round(spent * 100) / 100,
    limit: found.limit,
    month,
    threshold,
    currency,
  });
  return notify(db, {
    householdId,
    userIds: await memberIds(db, householdId),
    type: "budget",
    ...message,
    link: `/transactions?category=${categoryId}`,
    dedupeKey: budgetDedupeKey(categoryId, month, threshold),
  });
}

const forUser = (userId, householdId) => and(eq(notification.userId, userId), eq(notification.householdId, householdId));

/** The user's latest notifications in this household, newest first. */
export async function listNotifications(userId, householdId, { limit = NOTIFICATIONS_SHOWN } = {}) {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(forUser(userId, householdId))
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(limit);
}

export async function unreadNotificationCount(userId, householdId) {
  const [row] = await db
    .select({ unread: count() })
    .from(notification)
    .where(and(forUser(userId, householdId), isNull(notification.readAt)));
  return row?.unread ?? 0;
}

/** Marks one notification read and returns its link (null if it isn't this user's). */
export async function markNotificationRead(userId, householdId, notificationId) {
  const [row] = await db
    .update(notification)
    .set({ readAt: sql`coalesce(${notification.readAt}, now())` })
    .where(and(forUser(userId, householdId), eq(notification.id, notificationId)))
    .returning({ link: notification.link });
  return row ?? null;
}

export async function markAllNotificationsRead(userId, householdId) {
  await db
    .update(notification)
    .set({ readAt: sql`now()` })
    .where(and(forUser(userId, householdId), isNull(notification.readAt)));
}
