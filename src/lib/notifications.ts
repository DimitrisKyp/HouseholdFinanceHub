// In-app notifications: who gets them, when, and the queries behind the notification centre.
// Each notification belongs to one user in one household. A dedupe key (unique per user) stops
// the same alert from being sent twice, e.g. "Groceries reached 80%" once per month.
import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, type DbExecutor } from "@/db";
import { category, expense, householdMember, notification, type MemberRole } from "@/db/schema";
import { monthStart } from "@/lib/forecast";
import { publish } from "@/lib/live";
import { budgetAlertMessage, budgetDedupeKey, budgetThreshold } from "@/lib/notification-messages";

/** How many notifications the notification centre shows. */
export const NOTIFICATIONS_SHOWN = 50;

/**
 * Sends one notification to each user. executor: db or a transaction. title/body are English;
 * data (from lib/notification-messages.js) lets it be shown in each reader's language. Users who already have a
 * notification with the same dedupeKey are skipped. Returns true if anything was sent.
 */
/** One notification for several users. title/body are the English text; data lets it be translated. */
export type NotificationMessage = {
  householdId: string;
  userIds: string[];
  type: string;
  title: string;
  body?: string | null;
  data?: unknown;
  link?: string | null;
  dedupeKey?: string | null;
};

export async function notify(executor: DbExecutor, message: NotificationMessage) {
  return (await notifyUsers(executor, message)).length > 0;
}

/** Like notify(), but returns the ids of the users who got it (not those who already had it). */
export async function notifyUsers(
  executor: DbExecutor,
  { householdId, userIds, type, title, body = null, data = null, link = null, dedupeKey = null }: NotificationMessage,
): Promise<string[]> {
  if (!userIds.length) return [];
  const sent = await executor
    .insert(notification)
    .values([...new Set(userIds)].map(userId => ({ householdId, userId, type, title, body, data, link, dedupeKey })))
    .onConflictDoNothing()
    .returning({ userId: notification.userId });
  if (!sent.length) return [];
  const recipients = sent.map(row => row.userId);
  // Updates the unread badge of the people who got one (after the transaction commits, if in one).
  await publish({ householdId, kind: "notifications", userIds: recipients }, executor);
  return recipients;
}

/** User ids of the household's members, optionally only some roles. */
export async function memberIds(executor: DbExecutor, householdId: string, { roles }: { roles?: MemberRole[] } = {}) {
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
export async function checkBudgetAlert({
  householdId,
  categoryId,
  spentOn,
  today,
  currency,
}: {
  householdId: string;
  categoryId: string;
  spentOn: string;
  today: string;
  currency: string;
}) {
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

const forUser = (userId: string, householdId: string) => and(eq(notification.userId, userId), eq(notification.householdId, householdId));

/** The user's latest notifications in this household, newest first. */
export async function listNotifications(userId: string, householdId: string, { limit = NOTIFICATIONS_SHOWN }: { limit?: number } = {}) {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(forUser(userId, householdId))
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(limit);
}

export async function unreadNotificationCount(userId: string, householdId: string) {
  const [row] = await db
    .select({ unread: count() })
    .from(notification)
    .where(and(forUser(userId, householdId), isNull(notification.readAt)));
  return row?.unread ?? 0;
}

/** Marks one notification read and returns its link (null if it isn't this user's). */
export async function markNotificationRead(userId: string, householdId: string, notificationId: string) {
  const [row] = await db
    .update(notification)
    .set({ readAt: sql`coalesce(${notification.readAt}, now())` })
    .where(and(forUser(userId, householdId), eq(notification.id, notificationId)))
    .returning({ link: notification.link });
  return row ?? null;
}

export async function markAllNotificationsRead(userId: string, householdId: string) {
  await db
    .update(notification)
    .set({ readAt: sql`now()` })
    .where(and(forUser(userId, householdId), isNull(notification.readAt)));
}
