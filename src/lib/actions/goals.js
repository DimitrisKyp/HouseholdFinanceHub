"use server";

// Server Actions for savings goals and the money put towards them.
// Owners and editors may change goals (requirePermission("finance:write")); viewers may not.
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goal, goalContribution } from "@/db/schema";
import { requirePermission } from "@/lib/dal";
import { GOAL_STATUSES } from "@/lib/finance";
import { formatMoney, todayIn } from "@/lib/format";
import { field, parseAmount, parseDate, UUID_PATTERN } from "@/lib/forms";
import { announce } from "@/lib/live";
import { goalReachedMessage } from "@/lib/notification-messages";
import { memberIds, notify } from "@/lib/notifications";

const MAX_NAME_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;

// Goals also appear on the dashboard; everyone else's pages are refreshed too.
async function refreshGoalPages(context, message = `${context.user.name} updated the goals`) {
  revalidatePath("/goals");
  revalidatePath("/");
  await announce(context, "goals", message);
}

/** The goal if it belongs to this household, else null. */
async function findGoal(householdId, goalId) {
  if (!UUID_PATTERN.test(goalId)) return null;
  const [row] = await db
    .select({ id: goal.id, name: goal.name })
    .from(goal)
    .where(and(eq(goal.id, goalId), eq(goal.householdId, householdId)));
  return row ?? null;
}

export async function addGoalAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const values = {
    name: field(formData, "name"),
    targetAmount: field(formData, "targetAmount"),
    targetDate: field(formData, "targetDate"),
    startingAmount: field(formData, "startingAmount"),
    note: field(formData, "note"),
  };
  const today = todayIn(context.timezone);

  const errors = {};
  if (!values.name) errors.name = "Name the goal.";
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = "That name is too long.";
  const targetAmount = parseAmount(values.targetAmount);
  if (targetAmount === null) errors.targetAmount = "Enter the amount you want to reach, e.g. 5000.";
  let targetDate = null;
  if (values.targetDate) {
    targetDate = parseDate(values.targetDate);
    if (!targetDate) errors.targetDate = "Enter a valid date.";
    else if (targetDate <= today) errors.targetDate = "Choose a date in the future.";
  }
  let startingAmount = null;
  if (values.startingAmount) {
    startingAmount = parseAmount(values.startingAmount, { allowZero: true });
    if (startingAmount === null) errors.startingAmount = "Enter an amount, e.g. 250, or leave it empty.";
  }
  if (values.note.length > MAX_NOTE_LENGTH) errors.note = `Use at most ${MAX_NOTE_LENGTH} characters.`;
  if (Object.keys(errors).length) return { errors, values };

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
        note: "Already saved",
        userId: context.user.id,
      });
    }
  });
  await refreshGoalPages(context);
  return { success: `${values.name} added.`, values: {} };
}

// Tells every member when a deposit takes a goal to its target (once per goal). Returns true if sent.
async function notifyIfGoalReached(tx, { context, goal: found, amount }) {
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
export async function addContributionAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const direction = field(formData, "direction") === "withdraw" ? -1 : 1;
  const values = { amount: field(formData, "amount"), note: field(formData, "note") };

  const errors = {};
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = "Enter an amount above zero.";
  if (values.note.length > MAX_NOTE_LENGTH) errors.note = `Use at most ${MAX_NOTE_LENGTH} characters.`;
  if (Object.keys(errors).length) return { errors, values };
  const goalId = field(formData, "goalId");
  if (!UUID_PATTERN.test(goalId)) return { error: "This goal no longer exists." };

  const result = await db.transaction(async tx => {
    // Lock the goal so two withdrawals at the same moment can't both pass the balance check.
    const [found] = await tx
      .select({ id: goal.id, name: goal.name, targetAmount: goal.targetAmount })
      .from(goal)
      .where(and(eq(goal.id, goalId), eq(goal.householdId, context.householdId)))
      .for("update");
    if (!found) return { error: "This goal no longer exists." };

    if (direction < 0) {
      const [{ saved }] = await tx
        .select({ saved: sql`coalesce(sum(${goalContribution.amount}), 0)`.mapWith(Number) })
        .from(goalContribution)
        .where(eq(goalContribution.goalId, found.id));
      if (amount > saved + 0.001) {
        return { errors: { amount: `Only ${formatMoney(saved, context.currency)} is saved for this goal.` }, values };
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
    const verb = direction > 0 ? "added to" : "taken from";
    return { success: `${formatMoney(amount, context.currency)} ${verb} ${found.name}.`, values: {}, goalName: found.name };
  });

  if (result.success) {
    const money = formatMoney(amount, context.currency);
    await refreshGoalPages(
      context,
      direction > 0
        ? `${context.user.name} added ${money} to ${result.goalName}`
        : `${context.user.name} took ${money} from ${result.goalName}`,
    );
  }
  delete result.goalName;
  return result;
}

export async function setGoalStatusAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const status = field(formData, "status");
  if (!GOAL_STATUSES.includes(status)) return { error: "Something went wrong. Refresh the page and try again." };

  const found = await findGoal(context.householdId, field(formData, "goalId"));
  if (!found) return { error: "This goal no longer exists." };

  await db.update(goal).set({ status }).where(eq(goal.id, found.id));
  await refreshGoalPages(context);
  const messages = { active: "resumed", paused: "paused", completed: "marked as completed" };
  return { success: `${found.name} ${messages[status]}.` };
}

/** Deletes the goal and its contribution history. */
export async function deleteGoalAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const found = await findGoal(context.householdId, field(formData, "goalId"));
  if (!found) return { error: "This goal no longer exists." };

  await db.delete(goal).where(eq(goal.id, found.id));
  await refreshGoalPages(context);
  return { success: `${found.name} deleted.` };
}
