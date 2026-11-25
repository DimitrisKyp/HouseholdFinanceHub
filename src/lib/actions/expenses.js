"use server";

// Server Actions for day-to-day expenses. Owners and editors may add or delete them
// (requirePermission("finance:write")); viewers may not.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getLocale, getTranslations } from "@/i18n/server";
import { category, expense, householdMember } from "@/db/schema";
import { requirePermission } from "@/lib/dal";
import { expenseName, formatMoney, NO_EXPENSE_TITLE, todayIn } from "@/lib/format";
import { field, parseAmount, parseDate, UUID_PATTERN } from "@/lib/forms";
import { announce, liveMessage } from "@/lib/live";
import { checkBudgetAlert } from "@/lib/notifications";

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
  const t = await getTranslations("dashboard");

  const errors = {};
  // The description is optional: without one the expense goes by its category.
  if (values.title.length > MAX_TITLE_LENGTH) errors.title = t("actions.titleTooLong");
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = t("actions.amountInvalid");
  const spentOn = values.spentOn ? parseDate(values.spentOn) : today;
  if (!spentOn) errors.spentOn = t("actions.dateInvalid");
  else if (spentOn > today) errors.spentOn = t("actions.dateFuture");

  const [foundCategory] = UUID_PATTERN.test(values.categoryId)
    ? await db
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(and(eq(category.id, values.categoryId), eq(category.householdId, context.householdId), eq(category.isArchived, false)))
    : [];
  if (!foundCategory) errors.categoryId = t("actions.chooseCategory");

  let paidByUserId = null;
  if (values.paidByUserId) {
    const [member] = await db
      .select({ userId: householdMember.userId })
      .from(householdMember)
      .where(and(eq(householdMember.householdId, context.householdId), eq(householdMember.userId, values.paidByUserId)));
    if (member) paidByUserId = member.userId;
    else errors.paidByUserId = t("actions.chooseMember");
  }

  if (Object.keys(errors).length) return { errors, values };

  await db.insert(expense).values({
    householdId: context.householdId,
    categoryId: foundCategory.id,
    title: values.title || NO_EXPENSE_TITLE,
    amount,
    spentOn,
    paidByUserId,
    createdByUserId: context.user.id,
  });
  try {
    await checkBudgetAlert({
      householdId: context.householdId,
      categoryId: foundCategory.id,
      spentOn,
      today,
      currency: context.currency,
    });
  } catch (error) {
    // The expense is saved either way; a missed alert isn't worth failing the form for.
    console.error("Budget alert check failed", error);
  }
  revalidatePath("/");
  revalidatePath("/transactions");
  const name = expenseName(values.title, foundCategory.name);
  await announce(
    context,
    "expenses",
    liveMessage("expenseAdded", { name: context.user.name, title: name, amount, currency: context.currency }),
  );
  // Keep category, payer and date for the next entry (people often log several at once).
  return {
    success: t("actions.added", { title: name, amount: formatMoney(amount, context.currency, await getLocale()) }),
    values: { categoryId: values.categoryId, paidByUserId: values.paidByUserId, spentOn: values.spentOn },
  };
}

export async function deleteExpenseAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("dashboard");
  const expenseId = field(formData, "expenseId");
  if (!UUID_PATTERN.test(expenseId)) return { error: t("actions.notFound") };

  const removed = await db
    .delete(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, context.householdId)))
    .returning({ id: expense.id, title: expense.title, categoryId: expense.categoryId });
  if (!removed.length) return { error: t("actions.notFound") };
  let title = removed[0].title;
  if (title === NO_EXPENSE_TITLE) {
    const [found] = await db.select({ name: category.name }).from(category).where(eq(category.id, removed[0].categoryId));
    title = expenseName(title, found?.name);
  }
  revalidatePath("/");
  revalidatePath("/transactions");
  await announce(context, "expenses", liveMessage("expenseDeleted", { name: context.user.name, title }));
  return { success: t("actions.deleted") };
}
