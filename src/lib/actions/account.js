"use server";

// Server Actions for the Account page: your name, language and theme, and (owner only) the
// household settings. chooseLanguageAction also serves the sign-in pages.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { household } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getTranslations, rememberLocale } from "@/i18n/server";
import { auth } from "@/lib/auth";
import { getMembership, getSession, requirePermission, requireUser } from "@/lib/dal";
import { field } from "@/lib/forms";
import { liveMessage, publish } from "@/lib/live";
import { CURRENCIES, rememberTheme, saveLocale, saveTheme, THEMES, timezones } from "@/lib/preferences";

const MAX_NAME_LENGTH = 100;

export async function updateThemeAction(_previousState, formData) {
  const user = await requireUser();
  const t = await getTranslations("account");
  const theme = field(formData, "theme");
  if (!THEMES.includes(theme)) return { error: t("appearance.chooseTheme") };
  await saveTheme(user.id, theme);
  await rememberTheme(theme);
  revalidatePath("/", "layout");
  return { success: t("appearance.themeSaved"), theme };
}

/** Account page: saves the language to the account (so other devices get it at sign-in) and this browser. */
export async function updateLanguageAction(_previousState, formData) {
  const user = await requireUser();
  const locale = field(formData, "locale");
  if (!isLocale(locale)) return { error: (await getTranslations("account"))("appearance.chooseLanguage") };
  await saveLocale(user.id, locale);
  await rememberLocale(locale);
  revalidatePath("/", "layout");
  // Confirmed in the new language, like the rest of the page after this.
  return { success: (await getTranslations("account", locale))("appearance.languageSaved"), locale };
}

/** Language links on the sign-in pages: this browser only, plus the account if someone is signed in. */
export async function chooseLanguageAction(formData) {
  const locale = field(formData, "locale");
  if (!isLocale(locale)) return;
  await rememberLocale(locale);
  const session = await getSession();
  if (session?.user) await saveLocale(session.user.id, locale);
  revalidatePath("/", "layout");
}

export async function updateProfileAction(_previousState, formData) {
  const user = await requireUser();
  const t = await getTranslations("account");
  const values = { name: field(formData, "name") };
  if (!values.name) return { values, errors: { name: t("profile.nameMissing") } };
  if (values.name.length > MAX_NAME_LENGTH) return { values, errors: { name: t("profile.nameTooLong") } };

  await auth.api.updateUser({ body: { name: values.name }, headers: await headers() });
  revalidatePath("/", "layout");
  // Your name appears on other people's pages (members, who paid), so refresh theirs too.
  const membership = await getMembership(user.id);
  if (membership) await publish({ householdId: membership.householdId, kind: "members", actorId: user.id });
  return { success: t("profile.saved"), values };
}

export async function updateHouseholdAction(_previousState, formData) {
  const context = await requirePermission("household:manage");
  const t = await getTranslations("account");
  const values = { name: field(formData, "name"), currency: field(formData, "currency"), timezone: field(formData, "timezone") };

  const errors = {};
  if (!values.name) errors.name = t("household.nameMissing");
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = t("household.nameTooLong");
  if (!CURRENCIES.includes(values.currency)) errors.currency = t("household.chooseCurrency");
  if (!timezones().includes(values.timezone)) errors.timezone = t("household.chooseTimezone");
  if (Object.keys(errors).length) return { errors, values };

  await db.update(household).set(values).where(eq(household.id, context.householdId));
  revalidatePath("/", "layout");
  await publish({
    householdId: context.householdId,
    kind: "members",
    actorId: context.user.id,
    message: liveMessage("householdSettingsUpdated", { name: context.user.name }),
  });
  return { success: t("household.saved"), values };
}
