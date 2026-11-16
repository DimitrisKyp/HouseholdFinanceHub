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
import { EMAIL_COOLDOWN_MS, EMAIL_PATTERN, field, newPasswordErrors, passwordField } from "@/lib/forms";
import { createHouseholdWithOwner } from "@/lib/households";
import { checkEmailPath, safeRedirectPath, verificationCallbackPath } from "@/lib/redirects";
import { isTooSoon, withMinimumDuration } from "@/lib/throttle";

const MAX_NAME_LENGTH = 100;

function validateHouseholdName(name) {
  if (!name) return 'Give your household a name, e.g. "Our home".';
  if (name.length > MAX_NAME_LENGTH) return `Keep it under ${MAX_NAME_LENGTH} characters.`;
  return null;
}

export async function signUpAction(_previousState, formData) {
  const values = {
    name: field(formData, "name"),
    email: field(formData, "email").toLowerCase(),
    householdName: field(formData, "householdName"),
  };
  const password = passwordField(formData, "password");
  const confirmPassword = passwordField(formData, "confirmPassword");

  const errors = newPasswordErrors(password, confirmPassword);
  if (!values.name) errors.name = "Enter your name.";
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = "That name is too long.";
  if (!EMAIL_PATTERN.test(values.email)) errors.email = "Enter a valid email address.";
  const householdError = validateHouseholdName(values.householdName);
  if (householdError) errors.householdName = householdError;
  if (Object.keys(errors).length) return { errors, values };

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
    return { values, error: "We couldn't create your account. Please try again." };
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
  }

  // Same page either way.
  redirect(checkEmailPath(values.email));
}

export async function signInAction(_previousState, formData) {
  const values = { email: field(formData, "email").toLowerCase() };
  const password = passwordField(formData, "password");

  if (!values.email || !password) {
    return { values, error: "Enter your email and password." };
  }

  const next = safeRedirectPath(formData.get("next"));
  let needsVerification = false;
  try {
    await auth.api.signInEmail({
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
      // Same message whether the email or the password is wrong, so accounts can't be probed.
      return { values, error: "Incorrect email or password." };
    }
  }

  if (needsVerification) redirect(checkEmailPath(values.email, "sign-in"));
  redirect(next);
}

export async function resendVerificationAction(_previousState, formData) {
  const email = field(formData, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };

  if (isTooSoon(`verify:${email}`, EMAIL_COOLDOWN_MS)) {
    return { error: "We just sent one. Please wait a minute before asking again." };
  }

  try {
    // Sends only if the account exists and isn't confirmed yet, but always answers the same way
    // and takes the same time.
    await withMinimumDuration(1500, () =>
      auth.api.sendVerificationEmail({ body: { email, callbackURL: verificationCallbackPath() } }),
    );
  } catch (error) {
    console.error("Resending verification email failed", error);
    return { error: "We couldn't send the email. Please try again later." };
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

  const values = { householdName: field(formData, "householdName") };
  const householdError = validateHouseholdName(values.householdName);
  if (householdError) return { values, errors: { householdName: householdError } };

  try {
    await createHouseholdWithOwner({ userId: user.id, name: values.householdName });
  } catch (error) {
    console.error("Creating household failed", error);
    return { values, error: "We couldn't create your household. Please try again." };
  }

  redirect("/");
}
