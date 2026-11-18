"use server";

// Server Actions for the budget: recurring income and bills, and categories with monthly limits.
// Owners and editors may change these (requirePermission("finance:write")); viewers may not.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { category, householdMember, recurringItem } from "@/db/schema";
import { requirePermission } from "@/lib/dal";
import { FREQUENCIES } from "@/lib/finance";
import { todayIn } from "@/lib/format";
import { field, isUniqueViolation, parseAmount, UUID_PATTERN } from "@/lib/forms";

const MAX_TITLE_LENGTH = 120;
const MAX_CATEGORY_NAME_LENGTH = 50;

// The budget feeds the dashboard totals, so both pages are refreshed.
function refreshBudgetPages() {
  revalidatePath("/budget");
  revalidatePath("/");
}

/** The category if it belongs to this household (and isn't archived), else null. */
async function findCategory(householdId, categoryId, { allowArchived = false } = {}) {
  if (!UUID_PATTERN.test(categoryId)) return null;
  const [row] = await db
    .select({ id: category.id, name: category.name, isArchived: category.isArchived })
    .from(category)
    .where(and(eq(category.id, categoryId), eq(category.householdId, householdId)));
  if (!row || (row.isArchived && !allowArchived)) return null;
  return row;
}

/** True if the user is a member of this household. */
async function isMember(householdId, userId) {
  const [row] = await db
    .select({ id: householdMember.id })
    .from(householdMember)
    .where(and(eq(householdMember.householdId, householdId), eq(householdMember.userId, userId)));
  return Boolean(row);
}

// ── Recurring income and bills ───────────────────────────────────────────────

export async function addRecurringItemAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const type = field(formData, "type");
  if (type !== "income" && type !== "expense") return { error: "Something went wrong. Refresh the page and try again." };

  const values = {
    title: field(formData, "title"),
    amount: field(formData, "amount"),
    frequency: field(formData, "frequency"),
    categoryId: field(formData, "categoryId"),
    memberUserId: field(formData, "memberUserId"),
  };

  const errors = {};
  if (!values.title) errors.title = type === "income" ? "Describe this income." : "Name this bill.";
  else if (values.title.length > MAX_TITLE_LENGTH) errors.title = "That name is too long.";
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = "Enter an amount above zero, e.g. 1250 or 12.50.";
  if (!FREQUENCIES.includes(values.frequency)) errors.frequency = "Choose how often.";

  let categoryId = null;
  if (type === "expense") {
    const found = await findCategory(context.householdId, values.categoryId);
    if (!found) errors.categoryId = "Choose a category.";
    else categoryId = found.id;
  }

  let memberUserId = null;
  if (type === "income" && values.memberUserId) {
    if (await isMember(context.householdId, values.memberUserId)) memberUserId = values.memberUserId;
    else errors.memberUserId = "Choose a household member.";
  }

  if (Object.keys(errors).length) return { errors, values };

  await db.insert(recurringItem).values({
    householdId: context.householdId,
    type,
    title: values.title,
    amount,
    frequency: values.frequency,
    categoryId,
    memberUserId,
    startsOn: todayIn(context.timezone),
  });
  refreshBudgetPages();
  // Keep the choices (frequency, category, member) for the next entry; clear the rest.
  return {
    success: `${values.title} added.`,
    values: { frequency: values.frequency, categoryId: values.categoryId, memberUserId: values.memberUserId },
  };
}

// A bill's category decides which logged expenses it covers (see spendingBeyondBills), so it can be changed.
export async function updateBillCategoryAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const itemId = field(formData, "itemId");
  if (!UUID_PATTERN.test(itemId)) return { error: "This bill no longer exists." };
  const found = await findCategory(context.householdId, field(formData, "categoryId"));
  if (!found) return { error: "Choose a category." };

  const updated = await db
    .update(recurringItem)
    .set({ categoryId: found.id })
    .where(and(eq(recurringItem.id, itemId), eq(recurringItem.householdId, context.householdId), eq(recurringItem.type, "expense")))
    .returning({ id: recurringItem.id });
  if (!updated.length) return { error: "This bill no longer exists." };
  refreshBudgetPages();
  return { success: `Now in ${found.name}.` };
}

export async function deleteRecurringItemAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const itemId = field(formData, "itemId");
  if (!UUID_PATTERN.test(itemId)) return { error: "This item no longer exists." };

  const removed = await db
    .delete(recurringItem)
    .where(and(eq(recurringItem.id, itemId), eq(recurringItem.householdId, context.householdId)))
    .returning({ id: recurringItem.id });
  if (!removed.length) return { error: "This item no longer exists." };
  refreshBudgetPages();
  return { success: "Removed." };
}

// ── Categories ───────────────────────────────────────────────────────────────

// "" means "no limit"; otherwise a non-negative amount.
function parseLimit(raw) {
  if (raw === "") return { limit: null };
  const limit = parseAmount(raw, { allowZero: true });
  return limit === null ? { error: "Enter an amount, e.g. 300, or leave it empty for no limit." } : { limit };
}

export async function addCategoryAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const values = { name: field(formData, "name"), monthlyLimit: field(formData, "monthlyLimit") };

  const errors = {};
  if (!values.name) errors.name = "Name the category.";
  else if (values.name.length > MAX_CATEGORY_NAME_LENGTH) errors.name = `Use at most ${MAX_CATEGORY_NAME_LENGTH} characters.`;
  const { limit, error: limitError } = parseLimit(values.monthlyLimit);
  if (limitError) errors.monthlyLimit = limitError;
  if (Object.keys(errors).length) return { errors, values };

  try {
    await db.insert(category).values({ householdId: context.householdId, name: values.name, monthlyLimit: limit });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { values, errors: { name: "A category with this name already exists (it may be archived)." } };
    }
    throw error;
  }
  refreshBudgetPages();
  return { success: `${values.name} added.`, values: {} };
}

export async function updateCategoryLimitAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const found = await findCategory(context.householdId, field(formData, "categoryId"));
  if (!found) return { error: "This category no longer exists." };

  const { limit, error } = parseLimit(field(formData, "monthlyLimit"));
  if (error) return { error };

  await db.update(category).set({ monthlyLimit: limit }).where(eq(category.id, found.id));
  refreshBudgetPages();
  return { success: "Saved." };
}

// Archived categories disappear from pickers and the budget breakdown, but past expenses keep them.
export async function setCategoryArchivedAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const found = await findCategory(context.householdId, field(formData, "categoryId"), { allowArchived: true });
  if (!found) return { error: "This category no longer exists." };

  const archived = field(formData, "archived") === "true";
  await db.update(category).set({ isArchived: archived }).where(eq(category.id, found.id));
  refreshBudgetPages();
  return { success: archived ? `${found.name} archived.` : `${found.name} restored.` };
}
