import "server-only";
import { db } from "@/db";
import { category, household, householdMember } from "@/db/schema";

// Starter categories for a new household (monthly limit in the household currency, or null).
const DEFAULT_CATEGORIES = [
  ["Groceries", 650],
  ["Bills", 380],
  ["Transport", 240],
  ["Leisure", 180],
  ["Housing", null],
  ["Utilities", null],
  ["Subscriptions", null],
  ["Insurance", null],
];

/** Creates a household with `userId` as its owner, plus starter categories. All or nothing. */
export async function createHouseholdWithOwner({ userId, name }) {
  return db.transaction(async tx => {
    const [created] = await tx.insert(household).values({ name }).returning({ id: household.id });

    await tx.insert(householdMember).values({ householdId: created.id, userId, role: "owner" });

    await tx.insert(category).values(
      DEFAULT_CATEGORIES.map(([categoryName, monthlyLimit]) => ({
        householdId: created.id,
        name: categoryName,
        monthlyLimit,
      })),
    );

    return created.id;
  });
}
