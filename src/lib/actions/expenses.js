"use server";

// Server Actions for day-to-day expenses. Owners and editors may add or delete them
// (requirePermission("finance:write")); viewers may not.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { category, expense, householdMember } from "@/db/schema";
import { requirePermission } from "@/lib/dal";
import { formatMoney, todayIn } from "@/lib/format";
import { field, parseAmount, parseDate, UUID_PATTERN } from "@/lib/forms";

const MAX_TITLE_LENGTH = 120;

export async function addExpenseAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const values = {
    title: field(formData, "title"),
    amount: field(formData, "amount"),
    categoryId: field(formData, "categoryId"),
    paidByUserId: field(formData, "paidByUserId"),
    spentOn: field(formData, "spentOn"),
  };
  const today = todayIn(context.timezone);

  const errors = {};
  if (!values.title) errors.title = "What was it for?";
  else if (values.title.length > MAX_TITLE_LENGTH) errors.title = "That description is too long.";
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = "Enter an amount above zero, e.g. 45 or 12.50.";
  const spentOn = values.spentOn ? parseDate(values.spentOn) : today;
  if (!spentOn) errors.spentOn = "Enter a valid date.";
  else if (spentOn > today) errors.spentOn = "The date can't be in the future.";

  const [foundCategory] = UUID_PATTERN.test(values.categoryId)
    ? await db
        .select({ id: category.id })
        .from(category)
        .where(and(eq(category.id, values.categoryId), eq(category.householdId, context.householdId), eq(category.isArchived, false)))
    : [];
  if (!foundCategory) errors.categoryId = "Choose a category.";

  let paidByUserId = null;
  if (values.paidByUserId) {
    const [member] = await db
      .select({ userId: householdMember.userId })
      .from(householdMember)
      .where(and(eq(householdMember.householdId, context.householdId), eq(householdMember.userId, values.paidByUserId)));
    if (member) paidByUserId = member.userId;
    else errors.paidByUserId = "Choose a household member.";
  }

  if (Object.keys(errors).length) return { errors, values };

  await db.insert(expense).values({
    householdId: context.householdId,
    categoryId: foundCategory.id,
    title: values.title,
    amount,
    spentOn,
    paidByUserId,
    createdByUserId: context.user.id,
  });
  revalidatePath("/");
  // Keep category, payer and date for the next entry (people often log several at once).
  return {
    success: `${values.title} (${formatMoney(amount, context.currency)}) added.`,
    values: { categoryId: values.categoryId, paidByUserId: values.paidByUserId, spentOn: values.spentOn },
  };
}

export async function deleteExpenseAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const expenseId = field(formData, "expenseId");
  if (!UUID_PATTERN.test(expenseId)) return { error: "This expense no longer exists." };

  const removed = await db
    .delete(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, context.householdId)))
    .returning({ id: expense.id });
  if (!removed.length) return { error: "This expense no longer exists." };
  revalidatePath("/");
  return { success: "Expense deleted." };
}
