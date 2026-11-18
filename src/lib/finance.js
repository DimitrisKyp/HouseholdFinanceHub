// Read queries for household finance data. Callers pass the householdId from the DAL
// (requireHousehold), so every query is scoped to the household the user belongs to.
import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { category, recurringItem, user } from "@/db/schema";

export const FREQUENCIES = ["weekly", "monthly", "yearly"];
export const FREQUENCY_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

// How many times per month something with this frequency happens, on average.
const PER_MONTH = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

/** The average monthly amount of a recurring item, rounded to cents. */
export const monthlyAmount = ({ amount, frequency }) => Math.round(amount * PER_MONTH[frequency] * 100) / 100;

/** Categories in alphabetical order. Archived ones are only included when asked for. */
export async function listCategories(householdId, { includeArchived = false } = {}) {
  return db
    .select({ id: category.id, name: category.name, monthlyLimit: category.monthlyLimit, isArchived: category.isArchived })
    .from(category)
    .where(
      includeArchived ? eq(category.householdId, householdId) : and(eq(category.householdId, householdId), eq(category.isArchived, false)),
    )
    .orderBy(asc(category.name));
}

/** Active recurring income and expenses, largest first, with category and member names. */
export async function listRecurringItems(householdId) {
  const rows = await db
    .select({
      id: recurringItem.id,
      type: recurringItem.type,
      title: recurringItem.title,
      amount: recurringItem.amount,
      frequency: recurringItem.frequency,
      categoryName: category.name,
      memberName: user.name,
    })
    .from(recurringItem)
    .leftJoin(category, eq(category.id, recurringItem.categoryId))
    .leftJoin(user, eq(user.id, recurringItem.memberUserId))
    .where(and(eq(recurringItem.householdId, householdId), eq(recurringItem.isActive, true)))
    .orderBy(desc(recurringItem.amount), asc(recurringItem.title));
  return rows.map(row => ({ ...row, monthlyAmount: monthlyAmount(row) }));
}

/** Total monthly income and fixed expenses from the active recurring items. */
export function recurringTotals(items) {
  const sum = type =>
    Math.round(items.filter(item => item.type === type).reduce((total, item) => total + item.monthlyAmount * 100, 0)) / 100;
  return { income: sum("income"), expenses: sum("expense") };
}
