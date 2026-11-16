// Data Access Layer: the single place that answers "who is this user, which household are they in,
// and what may they do?". Every page and Server Action that touches household data goes through here.
import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { household, householdMember } from "@/db/schema";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** The current session ({ session, user }) or null. Validated against the database. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The logged-in user, or redirect to sign-in. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
});

/**
 * The household the user works in, with their role, or null if they belong to none.
 * A user can belong to several households; until there is a switcher, the one they own
 * (otherwise the oldest membership) is used.
 */
export const getMembership = cache(async userId => {
  const [row] = await db
    .select({
      householdId: household.id,
      householdName: household.name,
      currency: household.currency,
      timezone: household.timezone,
      role: householdMember.role,
    })
    .from(householdMember)
    .innerJoin(household, eq(household.id, householdMember.householdId))
    .where(eq(householdMember.userId, userId))
    .orderBy(sql`case when ${householdMember.role} = 'owner' then 0 else 1 end`, asc(householdMember.joinedAt))
    .limit(1);
  return row ?? null;
});

/** User + household + role, or redirect (to sign-in, or to onboarding if they have no household). */
export const requireHousehold = cache(async () => {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");
  return { user, ...membership };
});

/** Like requireHousehold, but also enforces a permission from lib/permissions.js. */
export async function requirePermission(permission) {
  const context = await requireHousehold();
  if (!can(context.role, permission)) {
    throw new Error("You don't have permission to do that.");
  }
  return context;
}
