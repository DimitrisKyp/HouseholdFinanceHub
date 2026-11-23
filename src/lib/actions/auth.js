"use server";

// Server Actions for account forms. Each returns { errors, error, values } for the form to show,
// or redirects on success. Never trust input here: these are public endpoints.
import { APIError } from "better-auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getMembership, requireUser } from "@/lib/dal";
import { EMAIL_COOLDOWN_MS, EMAIL_PATTERN, field, passwordField } from "@/lib/forms";
import { createHouseholdWithOwner } from "@/lib/households";
import { translatedPasswordErrors } from "@/lib/password-errors";
import { checkEmailPath, safeRedirectPath, verificationCallbackPath } from "@/lib/redirects";
import { clientIp } from "@/lib/request";
import { blockedFor, clearAttempts, countAttempt, isTooSoon, LIMITS, tooManyMessage, withMinimumDuration } from "@/lib/throttle";
import { getLocale, getTranslations, rememberLocale } from "@/i18n/server";
import { rememberTheme, saveLocale, savedLocale, savedTheme } from "@/lib/preferences";

const MAX_NAME_LENGTH = 100;

function validateHouseholdName(name, t) {
  if (!name) return t("errors.householdNameMissing");
  if (name.length > MAX_NAME_LENGTH) return t("errors.householdNameTooLong", { max: MAX_NAME_LENGTH });
  return null;
}

export async function signUpAction(_previousState, formData) {
  const t = await getTranslations("auth");
  const values = {
    name: field(formData, "name"),
    email: field(formData, "email").toLowerCase(),
    householdName: field(formData, "householdName"),
  };
  const password = passwordField(formData, "password");
  const confirmPassword = passwordField(formData, "confirmPassword");

  const errors = translatedPasswordErrors(t, password, confirmPassword);
  if (!values.name) errors.name = t("errors.nameMissing");
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = t("errors.nameTooLong");
  if (!EMAIL_PATTERN.test(values.email)) errors.email = t("errors.emailInvalid");
  const householdError = validateHouseholdName(values.householdName, t);
  if (householdError) errors.householdName = householdError;
  if (Object.keys(errors).length) return { errors, values };

  const ipKey = `signup:${await clientIp()}`;
  const waitSignUp = blockedFor(ipKey, LIMITS.signUpPerIp);
  if (waitSignUp) return { values, error: tooManyMessage(waitSignUp, t) };
  countAttempt(ipKey, LIMITS.signUpPerIp);

  let result;
  try {
    // Creates the user and emails them a confirmation link. No session yet: they're logged in
    // when they click the link. If the email is already registered, Better Auth returns a fake
    // user (and emails the real owner) so this form can't reveal which emails have accounts.
    result = await auth.api.signUpEmail({
      body: { name: values.name, email: values.email, password, callbackURL: verificationCallbackPath() },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Sign-up failed", error);
    return { values, error: t("errors.signUpFailed") };
  }

  // Only a real, newly created user gets a household (the fake one isn't in the database).
  const [created] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, result.user.id));
  if (created) {
    try {
      await createHouseholdWithOwner({ userId: created.id, name: values.householdName });
    } catch (error) {
      // Not fatal: after confirming their email they land on onboarding and can retry.
      console.error("Creating household failed", error);
    }
    // Keep the language they signed up in, so it follows them to other devices.
    try {
      await saveLocale(created.id, await getLocale());
    } catch (error) {
      console.error("Saving the language failed", error);
    }
  }

  // Same page either way.
  redirect(checkEmailPath(values.email));
}

export async function signInAction(_previousState, formData) {
  const t = await getTranslations("auth");
  const values = { email: field(formData, "email").toLowerCase() };
  const password = passwordField(formData, "password");

  if (!values.email || !password) {
    return { values, error: t("errors.signInMissing") };
  }

  // Password guessing: limited per account and per address (only failed attempts count).
  const emailKey = `signin:email:${values.email}`;
  const ipKey = `signin:ip:${await clientIp()}`;
  const wait = Math.max(blockedFor(emailKey, LIMITS.signInPerEmail), blockedFor(ipKey, LIMITS.signInPerIp));
  if (wait) return { values, error: tooManyMessage(wait, t) };

  const next = safeRedirectPath(formData.get("next"));
  let needsVerification = false;
  let signedIn;
  try {
    signedIn = await auth.api.signInEmail({
      // callbackURL: where the confirmation link (if one gets sent) brings them back to.
      body: { email: values.email, password, rememberMe: true, callbackURL: verificationCallbackPath(next) },
      headers: await headers(),
    });
  } catch (error) {
    // Only reachable with the correct password, so it reveals nothing to a stranger.
    // Better Auth has just emailed a fresh confirmation link.
    if (error instanceof APIError && error.body?.code === "EMAIL_NOT_VERIFIED") {
      needsVerification = true;
    } else {
      if (!(error instanceof APIError)) console.error("Sign-in failed", error);
      countAttempt(emailKey, LIMITS.signInPerEmail);
      countAttempt(ipKey, LIMITS.signInPerIp);
      // Same message whether the email or the password is wrong, so accounts can't be probed.
      return { values, error: t("errors.signInWrong") };
    }
  }

  clearAttempts(emailKey);
  if (needsVerification) redirect(checkEmailPath(values.email, "sign-in"));
  // Bring the theme and language chosen on another device to this browser.
  const theme = signedIn?.user ? await savedTheme(signedIn.user.id) : null;
  if (theme) await rememberTheme(theme);
  const locale = signedIn?.user ? await savedLocale(signedIn.user.id) : null;
  if (locale) await rememberLocale(locale);
  redirect(next);
}

export async function resendVerificationAction(_previousState, formData) {
  const t = await getTranslations("auth");
  const email = field(formData, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: t("errors.emailInvalid") };

  if (isTooSoon(`verify:${email}`, EMAIL_COOLDOWN_MS)) {
    return { error: t("errors.justSent") };
  }

  try {
    // Sends only if the account exists and isn't confirmed yet, but always answers the same way
    // and takes the same time.
    await withMinimumDuration(1500, () => auth.api.sendVerificationEmail({ body: { email, callbackURL: verificationCallbackPath() } }));
  } catch (error) {
    console.error("Resending verification email failed", error);
    return { error: t("errors.sendFailed") };
  }

  return { sent: true };
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

export async function createHouseholdAction(_previousState, formData) {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/");

  const t = await getTranslations("auth");
  const values = { householdName: field(formData, "householdName") };
  const householdError = validateHouseholdName(values.householdName, t);
  if (householdError) return { values, errors: { householdName: householdError } };

  try {
    await createHouseholdWithOwner({ userId: user.id, name: values.householdName });
  } catch (error) {
    console.error("Creating household failed", error);
    return { values, error: t("errors.createHouseholdFailed") };
  }

  redirect("/");
}
