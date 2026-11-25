"use server";

// Server Actions for the budget: recurring income and bills, and categories with monthly limits.
// Owners and editors may change these (requirePermission("finance:write")); viewers may not.
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { asset, category, expense, householdMember, recurringItem } from "@/db/schema";
import { getTranslations } from "@/i18n/server";
import { requirePermission } from "@/lib/dal";
import { ASSET_KINDS } from "@/lib/calculations";
import { FREQUENCIES } from "@/lib/finance";
import { announce, liveMessage } from "@/lib/live";
import { todayIn } from "@/lib/format";
import { field, isUniqueViolation, parseAmount, UUID_PATTERN } from "@/lib/forms";

const MAX_TITLE_LENGTH = 120;
const MAX_CATEGORY_NAME_LENGTH = 50;

// The budget feeds the dashboard totals, so both pages are refreshed, here and for everyone else.
async function refreshBudgetPages(context) {
  revalidatePath("/budget");
  revalidatePath("/categories");
  revalidatePath("/");
  await announce(context, "budget", liveMessage("budgetUpdated", { name: context.user.name }));
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
  const t = await getTranslations("budget");
  const type = field(formData, "type");
  if (type !== "income" && type !== "expense") return { error: t("errors.generic") };

  const values = {
    title: field(formData, "title"),
    amount: field(formData, "amount"),
    frequency: field(formData, "frequency"),
    categoryId: field(formData, "categoryId"),
    memberUserId: field(formData, "memberUserId"),
  };

  const errors = {};
  if (!values.title) errors.title = type === "income" ? t("errors.describeIncome") : t("errors.nameBill");
  else if (values.title.length > MAX_TITLE_LENGTH) errors.title = t("errors.nameTooLong");
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = t("errors.amount");
  if (!FREQUENCIES.includes(values.frequency)) errors.frequency = t("errors.chooseFrequency");

  let categoryId = null;
  if (type === "expense") {
    const found = await findCategory(context.householdId, values.categoryId);
    if (!found) errors.categoryId = t("errors.chooseCategory");
    else categoryId = found.id;
  }

  let memberUserId = null;
  if (type === "income" && values.memberUserId) {
    if (await isMember(context.householdId, values.memberUserId)) memberUserId = values.memberUserId;
    else errors.memberUserId = t("errors.chooseMember");
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
  await refreshBudgetPages(context);
  // Keep the choices (frequency, category, member) for the next entry; clear the rest.
  return {
    success: t("success.added", { name: values.title }),
    values: { frequency: values.frequency, categoryId: values.categoryId, memberUserId: values.memberUserId },
  };
}

// A bill's category decides which logged expenses it covers (see spendingBeyondBills), so it can be changed.
export async function updateBillCategoryAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const itemId = field(formData, "itemId");
  if (!UUID_PATTERN.test(itemId)) return { error: t("errors.billGone") };
  const found = await findCategory(context.householdId, field(formData, "categoryId"));
  if (!found) return { error: t("errors.chooseCategory") };

  const updated = await db
    .update(recurringItem)
    .set({ categoryId: found.id })
    .where(and(eq(recurringItem.id, itemId), eq(recurringItem.householdId, context.householdId), eq(recurringItem.type, "expense")))
    .returning({ id: recurringItem.id });
  if (!updated.length) return { error: t("errors.billGone") };
  await refreshBudgetPages(context);
  return { success: t("success.movedTo", { category: found.name }) };
}

export async function deleteRecurringItemAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const itemId = field(formData, "itemId");
  if (!UUID_PATTERN.test(itemId)) return { error: t("errors.itemGone") };

  const removed = await db
    .delete(recurringItem)
    .where(and(eq(recurringItem.id, itemId), eq(recurringItem.householdId, context.householdId)))
    .returning({ id: recurringItem.id });
  if (!removed.length) return { error: t("errors.itemGone") };
  await refreshBudgetPages(context);
  return { success: t("success.removed") };
}

// ── Categories ───────────────────────────────────────────────────────────────

// "" means "no limit"; otherwise a non-negative amount.
function parseLimit(raw, t) {
  if (raw === "") return { limit: null };
  const limit = parseAmount(raw, { allowZero: true });
  return limit === null ? { error: t("errors.limit") } : { limit };
}

export async function addCategoryAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const values = { name: field(formData, "name"), monthlyLimit: field(formData, "monthlyLimit") };

  const errors = {};
  if (!values.name) errors.name = t("errors.nameCategory");
  else if (values.name.length > MAX_CATEGORY_NAME_LENGTH) errors.name = t("errors.categoryNameLength", { max: MAX_CATEGORY_NAME_LENGTH });
  const { limit, error: limitError } = parseLimit(values.monthlyLimit, t);
  if (limitError) errors.monthlyLimit = limitError;
  if (Object.keys(errors).length) return { errors, values };

  try {
    await db.insert(category).values({ householdId: context.householdId, name: values.name, monthlyLimit: limit });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { values, errors: { name: t("errors.categoryExists") } };
    }
    throw error;
  }
  await refreshBudgetPages(context);
  return { success: t("success.added", { name: values.name }), values: {} };
}

export async function updateCategoryLimitAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const found = await findCategory(context.householdId, field(formData, "categoryId"));
  if (!found) return { error: t("errors.categoryGone") };

  const { limit, error } = parseLimit(field(formData, "monthlyLimit"), t);
  if (error) return { error };

  await db.update(category).set({ monthlyLimit: limit }).where(eq(category.id, found.id));
  await refreshBudgetPages(context);
  return { success: t("success.saved") };
}

// Archived categories disappear from pickers and the budget breakdown, but past expenses keep them.
export async function setCategoryArchivedAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const found = await findCategory(context.householdId, field(formData, "categoryId"), { allowArchived: true });
  if (!found) return { error: t("errors.categoryGone") };

  const archived = field(formData, "archived") === "true";
  await db.update(category).set({ isArchived: archived }).where(eq(category.id, found.id));
  await refreshBudgetPages(context);
  return { success: archived ? t("success.archived", { name: found.name }) : t("success.restored", { name: found.name }) };
}

// Deleting is for categories nobody has used: one with expenses can only be archived, so past
// expenses keep their category (the database refuses too). Bills in it are left without one.
export async function deleteCategoryAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const found = await findCategory(context.householdId, field(formData, "categoryId"), { allowArchived: true });
  if (!found) return { error: t("errors.categoryGone") };

  const [{ used }] = await db.select({ used: count() }).from(expense).where(eq(expense.categoryId, found.id));
  if (used > 0) return { error: t("errors.categoryInUse", { name: found.name }) };

  try {
    await db.delete(category).where(eq(category.id, found.id));
  } catch (error) {
    // An expense was logged under it a moment ago.
    if ((error?.cause?.code ?? error?.code) === "23503") return { error: t("errors.categoryInUse", { name: found.name }) };
    throw error;
  }
  await refreshBudgetPages(context);
  return { success: t("success.deleted", { name: found.name }) };
}

// ── Assets ───────────────────────────────────────────────────────────────────

const MAX_ASSET_NAME_LENGTH = 120;

async function findAsset(householdId, assetId) {
  if (!UUID_PATTERN.test(assetId)) return null;
  const [row] = await db
    .select({ id: asset.id, name: asset.name })
    .from(asset)
    .where(and(eq(asset.id, assetId), eq(asset.householdId, householdId)));
  return row ?? null;
}

// Only the Finances page shows assets.
async function refreshAssets(context) {
  revalidatePath("/budget");
  await announce(context, "budget", liveMessage("budgetUpdated", { name: context.user.name }));
}

export async function addAssetAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const values = { name: field(formData, "name"), kind: field(formData, "kind"), value: field(formData, "value") };

  const errors = {};
  if (!values.name) errors.name = t("errors.assetName");
  else if (values.name.length > MAX_ASSET_NAME_LENGTH) errors.name = t("errors.nameTooLong");
  if (!ASSET_KINDS.includes(values.kind)) errors.kind = t("errors.assetKind");
  const value = parseAmount(values.value, { allowZero: true });
  if (value === null) errors.value = t("errors.assetValue");
  if (Object.keys(errors).length) return { errors, values };

  await db.insert(asset).values({ householdId: context.householdId, name: values.name, kind: values.kind, value });
  await refreshAssets(context);
  // Keep the type for the next one.
  return { success: t("success.assetAdded", { name: values.name }), values: { kind: values.kind } };
}

export async function updateAssetValueAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const found = await findAsset(context.householdId, field(formData, "assetId"));
  if (!found) return { error: t("errors.assetGone") };
  const value = parseAmount(field(formData, "value"), { allowZero: true });
  if (value === null) return { error: t("errors.assetValue") };

  await db.update(asset).set({ value }).where(eq(asset.id, found.id));
  await refreshAssets(context);
  return { success: t("success.saved") };
}

export async function deleteAssetAction(_previousState, formData) {
  const context = await requirePermission("finance:write");
  const t = await getTranslations("budget");
  const found = await findAsset(context.householdId, field(formData, "assetId"));
  if (!found) return { error: t("errors.assetGone") };
  await db.delete(asset).where(eq(asset.id, found.id));
  await refreshAssets(context);
  return { success: t("success.assetDeleted", { name: found.name }) };
}
