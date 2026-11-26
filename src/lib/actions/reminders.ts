"use server";

// Server Actions for reminders: a bill's due date and reminder, marking it paid (optionally logging
// the expense), and household tasks. Owners and editors may change these; viewers may not.
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expense, householdMember, recurringItem, task } from "@/db/schema";
import { getLocale, getTranslations } from "@/i18n/server";
import { requirePermission, type HouseholdContext } from "@/lib/dal";
import { formatDay, todayIn } from "@/lib/format";
import { field, isOneOf, parseAmount, parseDate, UUID_PATTERN, type FieldErrors, type FormState } from "@/lib/forms";
import { announce, liveMessage, type LiveKind, type LiveMessage } from "@/lib/live";
import { checkBudgetAlert } from "@/lib/notifications";
import { clearReminderAlerts } from "@/lib/reminder-data";
import { nextDueDate, nextRepeatDate, REMIND_DAY_CHOICES, TASK_KINDS, TASK_REPEATS } from "@/lib/reminders";

const MAX_TITLE_LENGTH = 120;

export type BillReminderFormState = FormState<Partial<{ dueOn: string; remindDaysBefore: string; payerUserId: string }>>;
export type TaskFormState = FormState<
  Partial<{
    title: string;
    kind: string;
    amount: string;
    dueOn: string;
    repeat: string;
    remindDaysBefore: string;
    assigneeUserId: string;
  }>
>;

async function refreshReminderPages(context: HouseholdContext, message: LiveMessage | null = null, kind: LiveKind = "reminders") {
  revalidatePath("/reminders");
  revalidatePath("/");
  await announce(context, kind, message ?? liveMessage("remindersUpdated", { name: context.user.name }));
}

/** The user id if they're an owner or editor of this household ("" = nobody), else undefined. */
async function assignableMember(householdId: string, userId: string): Promise<string | null | undefined> {
  if (!userId) return null;
  if (userId.length > 64) return undefined;
  const [row] = await db
    .select({ userId: householdMember.userId, role: householdMember.role })
    .from(householdMember)
    .where(and(eq(householdMember.householdId, householdId), eq(householdMember.userId, userId)));
  return row && row.role !== "viewer" ? row.userId : undefined;
}

const parseRemindDays = (raw: string) => {
  const days = Number(raw);
  return REMIND_DAY_CHOICES.includes(days) ? days : null;
};

// ── Bills ────────────────────────────────────────────────────────────────────

async function findBill(householdId: string, itemId: string) {
  if (!UUID_PATTERN.test(itemId)) return null;
  const [row] = await db
    .select()
    .from(recurringItem)
    .where(and(eq(recurringItem.id, itemId), eq(recurringItem.householdId, householdId), eq(recurringItem.type, "expense")));
  return row ?? null;
}

/** Sets (or, with an empty due date, removes) a bill's reminder: next due date, days before, who pays. */
export async function saveBillReminderAction(_previousState: BillReminderFormState, formData: FormData): Promise<BillReminderFormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("reminders");
  const bill = await findBill(context.householdId, field(formData, "itemId"));
  if (!bill) return { error: t("errors.billGone") };

  if (field(formData, "remove") === "true") {
    await db.update(recurringItem).set({ dueOn: null, paidThrough: null }).where(eq(recurringItem.id, bill.id));
    await refreshReminderPages(context);
    return { success: t("success.reminderRemoved") };
  }

  const values = {
    dueOn: field(formData, "dueOn"),
    remindDaysBefore: field(formData, "remindDaysBefore"),
    payerUserId: field(formData, "payerUserId"),
  };
  const errors: FieldErrors = {};
  const dueOn = parseDate(values.dueOn);
  if (!dueOn) errors.dueOn = t("errors.dueDate");
  const remindDaysBefore = parseRemindDays(values.remindDaysBefore);
  if (remindDaysBefore === null) errors.remindDaysBefore = t("errors.remindDays");
  const payerUserId = await assignableMember(context.householdId, values.payerUserId);
  if (payerUserId === undefined) errors.payerUserId = t("errors.chooseMember");
  // The checks after the first are already covered by `errors`; repeating them lets TypeScript narrow the types.
  if (Object.keys(errors).length || !dueOn || remindDaysBefore === null || payerUserId === undefined) return { errors, values };

  // A new next due date starts the schedule again from there.
  await db
    .update(recurringItem)
    .set({ dueOn, paidThrough: null, remindDaysBefore, memberUserId: payerUserId })
    .where(eq(recurringItem.id, bill.id));
  await refreshReminderPages(context);
  return { success: t("success.reminderSaved", { title: bill.title }) };
}

/** Marks the bill's next due date as paid; with logExpense, also adds it as today's expense. */
export async function markBillPaidAction(_previousState: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("reminders");
  const bill = await findBill(context.householdId, field(formData, "itemId"));
  if (!bill) return { error: t("errors.billGone") };
  const dueDate = nextDueDate(bill);
  if (!dueDate) return { error: t("errors.noReminder") };
  // The page showed this due date; don't skip a second one if someone else just marked it paid.
  if (field(formData, "dueDate") && field(formData, "dueDate") !== dueDate) return { error: t("errors.alreadyPaid") };

  const today = todayIn(context.timezone);
  // The category to log the expense under; null when not logging (or the bill has no category).
  const logCategoryId = field(formData, "logExpense") === "on" ? bill.categoryId : null;
  await db.transaction(async tx => {
    await tx.update(recurringItem).set({ paidThrough: dueDate }).where(eq(recurringItem.id, bill.id));
    if (logCategoryId) {
      await tx.insert(expense).values({
        householdId: context.householdId,
        categoryId: logCategoryId,
        title: bill.title,
        amount: bill.amount,
        spentOn: today,
        paidByUserId: bill.memberUserId ?? context.user.id,
        createdByUserId: context.user.id,
      });
    }
  });
  await clearReminderAlerts(context.householdId, "bill", bill.id, dueDate);
  if (logCategoryId) {
    try {
      await checkBudgetAlert({
        householdId: context.householdId,
        categoryId: logCategoryId,
        spentOn: today,
        today,
        currency: context.currency,
      });
    } catch (error) {
      console.error("Budget alert check failed", error);
    }
    revalidatePath("/transactions");
  }
  await refreshReminderPages(
    context,
    liveMessage("billPaid", { name: context.user.name, title: bill.title }),
    logCategoryId ? "expenses" : "reminders",
  );
  return { success: logCategoryId ? t("success.paidAndLogged", { title: bill.title }) : t("success.paid", { title: bill.title }) };
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function addTaskAction(_previousState: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("reminders");
  const values = {
    title: field(formData, "title"),
    kind: field(formData, "kind"),
    amount: field(formData, "amount"),
    dueOn: field(formData, "dueOn"),
    repeat: field(formData, "repeat"),
    remindDaysBefore: field(formData, "remindDaysBefore"),
    assigneeUserId: field(formData, "assigneeUserId"),
  };

  const errors: FieldErrors = {};
  if (!values.title) errors.title = t("errors.taskTitle");
  else if (values.title.length > MAX_TITLE_LENGTH) errors.title = t("errors.titleTooLong");
  const rawKind = values.kind || "other";
  const kind = isOneOf(TASK_KINDS, rawKind) ? rawKind : null;
  if (!kind) errors.kind = t("errors.chooseKind");
  // Optional: with an amount it's a bill to pay, without one just a reminder.
  const amount = values.amount ? parseAmount(values.amount) : null;
  if (values.amount && amount === null) errors.amount = t("errors.amount");
  const dueOn = values.dueOn ? parseDate(values.dueOn) : null;
  if (values.dueOn && !dueOn) errors.dueOn = t("errors.dueDate");
  const rawRepeat = values.repeat || null;
  const repeat = rawRepeat && isOneOf(TASK_REPEATS, rawRepeat) ? rawRepeat : null;
  if (rawRepeat && !repeat) errors.repeat = t("errors.chooseRepeat");
  // A repeating task needs a first due date to count from.
  else if (repeat && !values.dueOn) errors.dueOn = t("errors.repeatNeedsDate");
  const remindDaysBefore = values.remindDaysBefore === "" ? 1 : parseRemindDays(values.remindDaysBefore);
  if (remindDaysBefore === null) errors.remindDaysBefore = t("errors.remindDays");
  const assigneeUserId = await assignableMember(context.householdId, values.assigneeUserId);
  if (assigneeUserId === undefined) errors.assigneeUserId = t("errors.chooseMember");
  // The checks after the first are already covered by `errors`; repeating them lets TypeScript narrow the types.
  if (Object.keys(errors).length || !kind || remindDaysBefore === null || assigneeUserId === undefined) return { errors, values };

  await db.insert(task).values({
    householdId: context.householdId,
    title: values.title,
    kind,
    amount,
    dueOn,
    repeat,
    remindDaysBefore,
    assigneeUserId,
    createdByUserId: context.user.id,
  });
  await refreshReminderPages(context);
  // Keep the type, reminder choice and person for the next one; clear the rest.
  return {
    success: t("success.taskAdded", { title: values.title }),
    values: { kind: values.kind, remindDaysBefore: values.remindDaysBefore, assigneeUserId: values.assigneeUserId },
  };
}

async function findTask(householdId: string, taskId: string) {
  if (!UUID_PATTERN.test(taskId)) return null;
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.householdId, householdId)));
  return row ?? null;
}

/** done=true finishes a task, done=false puts it back on the list. */
export async function setTaskDoneAction(_previousState: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("reminders");
  const found = await findTask(context.householdId, field(formData, "taskId"));
  if (!found) return { error: t("errors.taskGone") };
  const done = field(formData, "done") === "true";

  // A repeating task stays on the list: done moves it on to its next due date.
  if (done && found.repeat && found.dueOn) {
    // The page showed this due date; don't skip a second one if someone else just did it.
    if (field(formData, "dueDate") && field(formData, "dueDate") !== found.dueOn)
      return { success: t("success.taskDone", { title: found.title }) };
    const next = nextRepeatDate(found.dueOn, found.repeat, todayIn(context.timezone));
    const moved = await db
      .update(task)
      .set({ dueOn: next })
      .where(and(eq(task.id, found.id), eq(task.dueOn, found.dueOn)))
      .returning({ id: task.id });
    if (moved.length) {
      await clearReminderAlerts(context.householdId, "task", found.id, found.dueOn);
      await refreshReminderPages(context, liveMessage("taskDone", { name: context.user.name, title: found.title }));
    }
    return { success: t("success.taskRepeats", { title: found.title, date: formatDay(next, await getLocale()) }) };
  }

  const updated = await db
    .update(task)
    .set(done ? { doneAt: new Date(), doneByUserId: context.user.id } : { doneAt: null, doneByUserId: null })
    .where(and(eq(task.id, found.id), done ? isNull(task.doneAt) : isNotNull(task.doneAt)))
    .returning({ id: task.id });
  if (!updated.length)
    return { success: done ? t("success.taskDone", { title: found.title }) : t("success.taskReopened", { title: found.title }) };
  if (done) await clearReminderAlerts(context.householdId, "task", found.id, found.dueOn);
  await refreshReminderPages(context, done ? liveMessage("taskDone", { name: context.user.name, title: found.title }) : null);
  return { success: done ? t("success.taskDone", { title: found.title }) : t("success.taskReopened", { title: found.title }) };
}

export async function deleteTaskAction(_previousState: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("reminders");
  const found = await findTask(context.householdId, field(formData, "taskId"));
  if (!found) return { error: t("errors.taskGone") };
  await db.delete(task).where(eq(task.id, found.id));
  await clearReminderAlerts(context.householdId, "task", found.id, found.dueOn);
  await refreshReminderPages(context);
  return { success: t("success.taskDeleted") };
}
