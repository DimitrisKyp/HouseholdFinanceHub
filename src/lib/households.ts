import "server-only";
import { db } from "@/db";
import { category, household, householdMember } from "@/db/schema";
import { getTranslations } from "@/i18n/server";

// Starter categories for a new household: [key, monthly limit in the household currency or null,
// archived]. Only the first few are in use; the rest start archived, one click away on the
// Categories page. Named in the creator's language (budget messages, defaultCategories); after
// that they're the household's own data and are never translated again.
const DEFAULT_CATEGORIES: [key: string, monthlyLimit: number | null, isArchived: boolean][] = [
  ["groceries", 650, false],
  ["bills", 380, false],
  ["subscriptions", null, false],
  ["car", null, false],
  ["transport", null, true],
  ["leisure", null, true],
  ["housing", null, true],
  ["utilities", null, true],
  ["insurance", null, true],
];

/** Creates a household with `userId` as its owner, plus starter categories. All or nothing. */
export async function createHouseholdWithOwner({ userId, name }: { userId: string; name: string }) {
  const t = await getTranslations("budget");
  return db.transaction(async tx => {
    const [created] = await tx.insert(household).values({ name }).returning({ id: household.id });

    await tx.insert(householdMember).values({ householdId: created.id, userId, role: "owner" });

    await tx.insert(category).values(
      DEFAULT_CATEGORIES.map(([key, monthlyLimit, isArchived]) => ({
        householdId: created.id,
        name: t(`defaultCategories.${key}`),
        monthlyLimit,
        isArchived,
      })),
    );

    return created.id;
  });
}
