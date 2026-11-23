import "server-only";
import { db } from "@/db";
import { category, household, householdMember } from "@/db/schema";
import { getTranslations } from "@/i18n/server";

// Starter categories for a new household (monthly limit in the household currency, or null).
// Named in the creator's language (budget messages, defaultCategories); after that they're the
// household's own data and are never translated again.
const DEFAULT_CATEGORIES = [
  ["groceries", 650],
  ["bills", 380],
  ["transport", 240],
  ["leisure", 180],
  ["housing", null],
  ["utilities", null],
  ["subscriptions", null],
  ["insurance", null],
];

/** Creates a household with `userId` as its owner, plus starter categories. All or nothing. */
export async function createHouseholdWithOwner({ userId, name }) {
  const t = await getTranslations("budget");
  return db.transaction(async tx => {
    const [created] = await tx.insert(household).values({ name }).returning({ id: household.id });

    await tx.insert(householdMember).values({ householdId: created.id, userId, role: "owner" });

    await tx.insert(category).values(
      DEFAULT_CATEGORIES.map(([key, monthlyLimit]) => ({
        householdId: created.id,
        name: t(`defaultCategories.${key}`),
        monthlyLimit,
      })),
    );

    return created.id;
  });
}
