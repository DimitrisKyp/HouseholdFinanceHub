// Reminders: bills to pay (recurring bills with a due date) and tasks to do. The queries behind
// the Reminders page and the dashboard, and the daily job (/api/cron/reminders) that sends the
// alerts: an in-app notification for each, then one email per person with what they got.
// Date logic lives in lib/reminders.js.
// The daily job works through households, and sends emails, one at a time on purpose: it stays
// gentle on the database and the mail server.
/* eslint-disable no-await-in-loop */
import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { category, household, householdMember, notification, recurringItem, task, user, userPreference } from "@/db/schema";
import { sendRemindersEmail } from "@/lib/email";
import { todayIn } from "@/lib/format";
import { publish } from "@/lib/live";
import { reminderMessage, renderNotification } from "@/lib/notification-messages";
import { memberIds, notifyUsers } from "@/lib/notifications";
import { alertStage, byDueDate, daysBetween, dueStatus, nextDueDate, reminderDedupeKey, reminderDedupePrefix } from "@/lib/reminders";

/** Recently finished tasks shown under the open ones. */
const DONE_TASKS_SHOWN = 10;

/** Active recurring bills with their reminder settings and next due date (null = no reminder). */
export async function listBillReminders(householdId, today) {
  const rows = await db
    .select({
      id: recurringItem.id,
      title: recurringItem.title,
      amount: recurringItem.amount,
      frequency: recurringItem.frequency,
      categoryId: recurringItem.categoryId,
      categoryName: category.name,
      payerUserId: recurringItem.memberUserId,
      payerName: user.name,
      dueOn: recurringItem.dueOn,
      paidThrough: recurringItem.paidThrough,
      remindDaysBefore: recurringItem.remindDaysBefore,
    })
    .from(recurringItem)
    .leftJoin(category, eq(category.id, recurringItem.categoryId))
    .leftJoin(user, eq(user.id, recurringItem.memberUserId))
    .where(and(eq(recurringItem.householdId, householdId), eq(recurringItem.type, "expense"), eq(recurringItem.isActive, true)))
    .orderBy(asc(recurringItem.title));
  return rows
    .map(row => {
      const dueDate = nextDueDate(row);
      return { ...row, dueDate, ...(dueDate ? dueStatus(dueDate, today, row.remindDaysBefore) : { status: null, days: null }) };
    })
    .sort(byDueDate);
}

const assignee = alias(user, "assignee");
const doneBy = alias(user, "done_by");
const taskColumns = {
  id: task.id,
  title: task.title,
  kind: task.kind,
  amount: task.amount,
  repeat: task.repeat,
  dueDate: task.dueOn,
  remindDaysBefore: task.remindDaysBefore,
  assigneeUserId: task.assigneeUserId,
  assigneeName: assignee.name,
  doneAt: task.doneAt,
  doneByName: doneBy.name,
};

/** Open tasks (by due date, undated last) and the latest finished ones. */
export async function listTasks(householdId, today) {
  const base = () =>
    db
      .select(taskColumns)
      .from(task)
      .leftJoin(assignee, eq(assignee.id, task.assigneeUserId))
      .leftJoin(doneBy, eq(doneBy.id, task.doneByUserId));
  const [open, done] = await Promise.all([
    base()
      .where(and(eq(task.householdId, householdId), isNull(task.doneAt)))
      .orderBy(asc(task.createdAt)),
    base()
      .where(and(eq(task.householdId, householdId), isNotNull(task.doneAt)))
      .orderBy(desc(task.doneAt))
      .limit(DONE_TASKS_SHOWN),
  ]);
  const withStatus = row => ({
    ...row,
    ...(row.dueDate ? dueStatus(row.dueDate, today, row.remindDaysBefore) : { status: null, days: null }),
  });
  return { open: open.map(withStatus).sort(byDueDate), done };
}

/**
 * For the dashboard: bills and tasks that are overdue or due within UPCOMING_DAYS (or their
 * reminder window), soonest first. Items: { kind, id, title, dueDate, status, days, amount? }.
 */
export async function upcomingReminders(householdId, today, { limit = 4 } = {}) {
  const [bills, tasks] = await Promise.all([listBillReminders(householdId, today), listTasks(householdId, today)]);
  const soon = item => item.dueDate && item.status !== "later";
  return [
    ...bills.filter(soon).map(item => ({ kind: "bill", ...item })),
    ...tasks.open.filter(soon).map(item => ({ kind: "task", ...item })),
  ]
    .sort(byDueDate)
    .slice(0, limit);
}

/**
 * Marks a bill's or task's alerts for one due date as read for everyone, once it's paid or done,
 * so nobody is left with a stale "due today". Updates the unread badges of the people affected.
 */
export async function clearReminderAlerts(householdId, kind, id, dueDate) {
  if (!dueDate) return;
  const cleared = await db
    .update(notification)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notification.householdId, householdId),
        isNull(notification.readAt),
        like(notification.dedupeKey, `${reminderDedupePrefix(kind, id, dueDate)}%`),
      ),
    )
    .returning({ userId: notification.userId });
  if (cleared.length) await publish({ householdId, kind: "notifications", userIds: [...new Set(cleared.map(row => row.userId))] });
}

// ── The daily job ────────────────────────────────────────────────────────────

/** Who gets a reminder: the person it's for, or else everyone who can act on it (owner and editors). */
async function recipientsFor(householdId, userId, cache) {
  if (!cache.has(householdId)) {
    const [all, editors] = await Promise.all([memberIds(db, householdId), memberIds(db, householdId, { roles: ["owner", "editor"] })]);
    cache.set(householdId, { all, editors });
  }
  const { all, editors } = cache.get(householdId);
  // Only if they're still a member: the row may still point at someone who left.
  return userId && all.includes(userId) ? [userId] : editors;
}

/**
 * Sends the reminders owed today in every household (each in its own timezone): an in-app
 * notification per bill or task and stage, never twice (dedupe keys), then one email per person
 * listing the new ones. Safe to run more than once a day. Returns counts for the log.
 */
export async function runDueReminders() {
  const households = await db.select({ id: household.id, timezone: household.timezone, currency: household.currency }).from(household);
  const editorsCache = new Map();
  /** userId → [{ householdId, data }] of notifications sent now, for the emails. */
  const sentTo = new Map();
  let notifications = 0;

  const send = async ({ householdId, userId, kind, id, dueDate, stage, message }) => {
    const userIds = await recipientsFor(householdId, userId, editorsCache);
    const recipients = await notifyUsers(db, {
      householdId,
      userIds,
      type: "reminder",
      ...message,
      link: "/reminders",
      dedupeKey: reminderDedupeKey(kind, id, dueDate, stage),
    });
    notifications += recipients.length;
    for (const recipient of recipients) {
      if (!sentTo.has(recipient)) sentTo.set(recipient, []);
      sentTo.get(recipient).push(message);
    }
  };

  for (const home of households) {
    const today = todayIn(home.timezone);

    const bills = await db
      .select({
        id: recurringItem.id,
        title: recurringItem.title,
        amount: recurringItem.amount,
        frequency: recurringItem.frequency,
        dueOn: recurringItem.dueOn,
        paidThrough: recurringItem.paidThrough,
        remindDaysBefore: recurringItem.remindDaysBefore,
        payerUserId: recurringItem.memberUserId,
      })
      .from(recurringItem)
      .where(
        and(
          eq(recurringItem.householdId, home.id),
          eq(recurringItem.type, "expense"),
          eq(recurringItem.isActive, true),
          isNotNull(recurringItem.dueOn),
        ),
      );
    for (const bill of bills) {
      const dueDate = nextDueDate(bill);
      const stage = dueDate && alertStage(dueDate, today, bill.remindDaysBefore);
      if (!stage) continue;
      const days = daysBetween(today, dueDate);
      const message = reminderMessage({
        item: "bill",
        title: bill.title,
        dueDate,
        stage,
        days,
        overdue: days < 0,
        amount: bill.amount,
        currency: home.currency,
      });
      await send({ householdId: home.id, userId: bill.payerUserId, kind: "bill", id: bill.id, dueDate, stage, message });
    }

    const tasks = await db
      .select({
        id: task.id,
        title: task.title,
        amount: task.amount,
        dueOn: task.dueOn,
        remindDaysBefore: task.remindDaysBefore,
        assigneeUserId: task.assigneeUserId,
      })
      .from(task)
      .where(and(eq(task.householdId, home.id), isNull(task.doneAt), isNotNull(task.dueOn)));
    for (const item of tasks) {
      const stage = alertStage(item.dueOn, today, item.remindDaysBefore);
      if (!stage) continue;
      const days = daysBetween(today, item.dueOn);
      // A task with an amount is a bill to pay: the alert says how much.
      const message = reminderMessage({
        item: item.amount ? "bill" : "task",
        title: item.title,
        dueDate: item.dueOn,
        stage,
        days,
        overdue: days < 0,
        amount: item.amount,
        currency: home.currency,
      });
      await send({ householdId: home.id, userId: item.assigneeUserId, kind: "task", id: item.id, dueDate: item.dueOn, stage, message });
    }
  }

  const emails = await emailReminders(sentTo);
  return { households: households.length, notifications, ...emails };
}

/** One email per person with the reminders they just got, in their language. A failed email doesn't stop the others. */
async function emailReminders(sentTo) {
  if (!sentTo.size) return { emails: 0, emailErrors: 0 };
  const people = await db
    .select({ id: user.id, email: user.email, name: user.name, locale: userPreference.locale })
    .from(user)
    .leftJoin(userPreference, eq(userPreference.userId, user.id))
    .where(inArray(user.id, [...sentTo.keys()]));
  let emails = 0;
  let emailErrors = 0;
  for (const person of people) {
    const locale = person.locale ?? "en";
    const reminders = sentTo.get(person.id).map(message => renderNotification(message, locale));
    try {
      await sendRemindersEmail({ to: person.email, name: person.name, reminders, locale });
      emails += 1;
    } catch (error) {
      emailErrors += 1;
      console.error("Reminder email failed", { userId: person.id, error });
    }
  }
  return { emails, emailErrors };
}

/** Members who can be given a task or pay a bill (for the pickers). */
export async function listAssignableMembers(householdId) {
  return db
    .select({ userId: householdMember.userId, name: user.name })
    .from(householdMember)
    .innerJoin(user, eq(user.id, householdMember.userId))
    .where(and(eq(householdMember.householdId, householdId), inArray(householdMember.role, ["owner", "editor"])))
    .orderBy(asc(user.name));
}
