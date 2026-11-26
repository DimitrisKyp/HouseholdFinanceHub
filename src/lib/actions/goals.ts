"use server";

// Server Actions for savings goals and the money put towards them.
// Owners and editors may change goals (requirePermission("finance:write")); viewers may not.
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import type { Transaction } from "@/db";
import { goal, goalContribution } from "@/db/schema";
import { getLocale, getTranslations } from "@/i18n/server";
import { requirePermission, type HouseholdContext } from "@/lib/dal";
import { GOAL_STATUSES } from "@/lib/finance";
import { formatMoney, todayIn } from "@/lib/format";
import { field, isOneOf, parseAmount, parseDate, UUID_PATTERN, type FieldErrors, type FormState } from "@/lib/forms";
import { announce, liveMessage, type LiveMessage } from "@/lib/live";
import { goalReachedMessage } from "@/lib/notification-messages";
import { memberIds, notify } from "@/lib/notifications";

const MAX_NAME_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;

export type GoalFormState = FormState<
  Partial<{ name: string; targetAmount: string; targetDate: string; startingAmount: string; note: string }>
>;
export type ContributionFormState = FormState<Partial<{ amount: string; note: string }>>;

// Goals also appear on the dashboard; everyone else's pages are refreshed too.
async function refreshGoalPages(
  context: HouseholdContext,
  message: LiveMessage = liveMessage("goalsUpdated", { name: context.user.name }),
) {
  revalidatePath("/goals");
  revalidatePath("/");
  await announce(context, "goals", message);
}

/** The goal if it belongs to this household, else null. */
async function findGoal(householdId: string, goalId: string) {
  if (!UUID_PATTERN.test(goalId)) return null;
  const [row] = await db
    .select({ id: goal.id, name: goal.name })
    .from(goal)
    .where(and(eq(goal.id, goalId), eq(goal.householdId, householdId)));
  return row ?? null;
}

export async function addGoalAction(_previousState: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const context = await requirePermission("finance:write");
  const values = {
    name: field(formData, "name"),
    targetAmount: field(formData, "targetAmount"),
    targetDate: field(formData, "targetDate"),
    startingAmount: field(formData, "startingAmount"),
    note: field(formData, "note"),
  };
  const today = todayIn(context.timezone);
  const t = await getTranslations("goals");

  const errors: FieldErrors = {};
  if (!values.name) errors.name = t("actions.nameMissing");
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = t("actions.nameTooLong");
  const targetAmount = parseAmount(values.targetAmount);
  if (targetAmount === null) errors.targetAmount = t("actions.targetInvalid");
  let targetDate: string | null = null;
  if (values.targetDate) {
    targetDate = parseDate(values.targetDate);
    if (!targetDate) errors.targetDate = t("actions.dateInvalid");
    else if (targetDate <= today) errors.targetDate = t("actions.dateNotFuture");
  }
  let startingAmount: number | null = null;
  if (values.startingAmount) {
    startingAmount = parseAmount(values.startingAmount, { allowZero: true });
    if (startingAmount === null) errors.startingAmount = t("actions.startingInvalid");
  }
  if (values.note.length > MAX_NOTE_LENGTH) errors.note = t("actions.noteTooLong", { max: MAX_NOTE_LENGTH });
  // The null check is already covered by `errors`; repeating it lets TypeScript narrow the type.
  if (Object.keys(errors).length || targetAmount === null) return { errors, values };

  await db.transaction(async tx => {
    const [created] = await tx
      .insert(goal)
      .values({
        householdId: context.householdId,
        name: values.name,
        note: values.note || null,
        targetAmount,
        targetDate,
        ownerUserId: context.user.id,
      })
      .returning({ id: goal.id });
    // Money already saved is recorded as the first contribution, so progress has a history.
    if (startingAmount) {
      await tx.insert(goalContribution).values({
        goalId: created.id,
        amount: startingAmount,
        contributedOn: today,
        note: t("actions.alreadySaved"),
        userId: context.user.id,
      });
    }
  });
  await refreshGoalPages(context);
  return { success: t("actions.added", { name: values.name }), values: {} };
}

// Tells every member when a deposit takes a goal to its target (once per goal). Returns true if sent.
async function notifyIfGoalReached(
  tx: Transaction,
  { context, goal: found, amount }: { context: HouseholdContext; goal: { id: string; name: string; targetAmount: number }; amount: number },
) {
  const [{ saved }] = await tx
    .select({ saved: sql`coalesce(sum(${goalContribution.amount}), 0)`.mapWith(Number) })
    .from(goalContribution)
    .where(eq(goalContribution.goalId, found.id));
  if (saved + 0.001 < found.targetAmount || saved - amount + 0.001 >= found.targetAmount) return false;
  return notify(tx, {
    householdId: context.householdId,
    userIds: await memberIds(tx, context.householdId),
    type: "goal",
    ...goalReachedMessage({
      goalName: found.name,
      saved: Math.round(saved * 100) / 100,
      targetAmount: found.targetAmount,
      currency: context.currency,
    }),
    link: "/goals",
    dedupeKey: `goal:${found.id}:reached`,
  });
}

/** Adds money to a goal, or takes it out ("withdraw"), never below zero. */
export async function addContributionAction(_previousState: ContributionFormState, formData: FormData): Promise<ContributionFormState> {
  const context = await requirePermission("finance:write");
  const direction = field(formData, "direction") === "withdraw" ? -1 : 1;
  const values = { amount: field(formData, "amount"), note: field(formData, "note") };
  const [t, locale] = await Promise.all([getTranslations("goals"), getLocale()]);
  const money = (value: number) => formatMoney(value, context.currency, locale);

  const errors: FieldErrors = {};
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = t("actions.amountInvalid");
  if (values.note.length > MAX_NOTE_LENGTH) errors.note = t("actions.noteTooLong", { max: MAX_NOTE_LENGTH });
  // The null check is already covered by `errors`; repeating it lets TypeScript narrow the type.
  if (Object.keys(errors).length || amount === null) return { errors, values };
  const goalId = field(formData, "goalId");
  if (!UUID_PATTERN.test(goalId)) return { error: t("actions.goalGone") };

  const result = await db.transaction(async (tx): Promise<ContributionFormState & { goalName?: string }> => {
    // Lock the goal so two withdrawals at the same moment can't both pass the balance check.
    const [found] = await tx
      .select({ id: goal.id, name: goal.name, targetAmount: goal.targetAmount })
      .from(goal)
      .where(and(eq(goal.id, goalId), eq(goal.householdId, context.householdId)))
      .for("update");
    if (!found) return { error: t("actions.goalGone") };

    if (direction < 0) {
      const [{ saved }] = await tx
        .select({ saved: sql`coalesce(sum(${goalContribution.amount}), 0)`.mapWith(Number) })
        .from(goalContribution)
        .where(eq(goalContribution.goalId, found.id));
      if (amount > saved + 0.001) {
        return { errors: { amount: t("actions.onlySaved", { amount: money(saved) }) }, values };
      }
    }

    await tx.insert(goalContribution).values({
      goalId: found.id,
      amount: direction * amount,
      contributedOn: todayIn(context.timezone),
      note: values.note || null,
      userId: context.user.id,
    });
    if (direction > 0) await notifyIfGoalReached(tx, { context, goal: found, amount });
    const success = t(direction > 0 ? "actions.moneyAdded" : "actions.moneyTaken", { amount: money(amount), name: found.name });
    return { success, values: {}, goalName: found.name };
  });

  if (result.success) {
    await refreshGoalPages(
      context,
      liveMessage(direction > 0 ? "goalAdded" : "goalWithdrawn", {
        name: context.user.name,
        goal: result.goalName,
        amount,
        currency: context.currency,
      }),
    );
  }
  delete result.goalName;
  return result;
}

export async function setGoalStatusAction(_previousState: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("goals");
  const status = field(formData, "status");
  if (!isOneOf(GOAL_STATUSES, status)) return { error: t("actions.genericError") };

  const found = await findGoal(context.householdId, field(formData, "goalId"));
  if (!found) return { error: t("actions.goalGone") };

  await db.update(goal).set({ status }).where(eq(goal.id, found.id));
  await refreshGoalPages(context);
  const messages: Record<(typeof GOAL_STATUSES)[number], string> = {
    active: "actions.resumed",
    paused: "actions.paused",
    completed: "actions.completed",
  };
  return { success: t(messages[status], { name: found.name }) };
}

/** Deletes the goal and its contribution history. */
export async function deleteGoalAction(_previousState: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("goals");
  const found = await findGoal(context.householdId, field(formData, "goalId"));
  if (!found) return { error: t("actions.goalGone") };

  await db.delete(goal).where(eq(goal.id, found.id));
  await refreshGoalPages(context);
  return { success: t("actions.deleted", { name: found.name }) };
}
