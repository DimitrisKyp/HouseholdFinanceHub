"use server";

// Server Actions for the Account page: your name and theme, and (owner only) the household settings.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { household } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getMembership, requirePermission, requireUser } from "@/lib/dal";
import { field } from "@/lib/forms";
import { publish } from "@/lib/live";
import { CURRENCIES, rememberTheme, saveTheme, THEMES, timezones } from "@/lib/preferences";

const MAX_NAME_LENGTH = 100;

export async function updateThemeAction(_previousState, formData) {
  const user = await requireUser();
  const theme = field(formData, "theme");
  if (!THEMES.includes(theme)) return { error: "Choose a theme." };
  await saveTheme(user.id, theme);
  await rememberTheme(theme);
  revalidatePath("/", "layout");
  return { success: "Theme saved.", theme };
}

export async function updateProfileAction(_previousState, formData) {
  const user = await requireUser();
  const values = { name: field(formData, "name") };
  if (!values.name) return { values, errors: { name: "Enter your name." } };
  if (values.name.length > MAX_NAME_LENGTH) return { values, errors: { name: "That name is too long." } };

  await auth.api.updateUser({ body: { name: values.name }, headers: await headers() });
  revalidatePath("/", "layout");
  // Your name appears on other people's pages (members, who paid), so refresh theirs too.
  const membership = await getMembership(user.id);
  if (membership) await publish({ householdId: membership.householdId, kind: "members", actorId: user.id });
  return { success: "Name saved.", values };
}

export async function updateHouseholdAction(_previousState, formData) {
  const context = await requirePermission("household:manage");
  const values = { name: field(formData, "name"), currency: field(formData, "currency"), timezone: field(formData, "timezone") };

  const errors = {};
  if (!values.name) errors.name = "Name the household.";
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = "That name is too long.";
  if (!CURRENCIES.includes(values.currency)) errors.currency = "Choose a currency.";
  if (!timezones().includes(values.timezone)) errors.timezone = "Choose a timezone.";
  if (Object.keys(errors).length) return { errors, values };

  await db.update(household).set(values).where(eq(household.id, context.householdId));
  revalidatePath("/", "layout");
  await publish({
    householdId: context.householdId,
    kind: "members",
    actorId: context.user.id,
    message: `${context.user.name} updated the household settings`,
  });
  return { success: "Household settings saved.", values };
}
