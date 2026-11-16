"use server";

// Server Actions for account forms. Each returns { errors, error, values } for the form to show,
// or redirects on success. Never trust input here: these are public endpoints.
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembership, requireUser } from "@/lib/dal";
import { createHouseholdWithOwner } from "@/lib/households";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

const field = (formData, key) => String(formData.get(key) ?? "").trim();

// Only allow redirects to paths on this site (blocks "https://evil.com" and "//evil.com").
function safeRedirectPath(value) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/";
}

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
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors = {};
  if (!values.name) errors.name = "Enter your name.";
  else if (values.name.length > MAX_NAME_LENGTH) errors.name = "That name is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) errors.confirmPassword = "The passwords don't match.";
  const householdError = validateHouseholdName(values.householdName);
  if (householdError) errors.householdName = householdError;
  if (Object.keys(errors).length) return { errors, values };

  let userId;
  try {
    // Creates the user, hashes the password and logs them in (sets the session cookie).
    const result = await auth.api.signUpEmail({
      body: { name: values.name, email: values.email, password },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return { values, error: "An account with this email already exists. Sign in instead." };
    }
    console.error("Sign-up failed", error);
    return { values, error: "We couldn't create your account. Please try again." };
  }

  try {
    await createHouseholdWithOwner({ userId, name: values.householdName });
  } catch (error) {
    // The account exists and is logged in; onboarding lets them retry creating the household.
    console.error("Creating household failed", error);
    redirect("/onboarding");
  }

  redirect("/");
}

export async function signInAction(_previousState, formData) {
  const values = { email: field(formData, "email").toLowerCase() };
  const password = String(formData.get("password") ?? "");

  if (!values.email || !password) {
    return { values, error: "Enter your email and password." };
  }

  try {
    await auth.api.signInEmail({
      body: { email: values.email, password, rememberMe: true },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) console.error("Sign-in failed", error);
    // Same message whether the email or the password is wrong, so accounts can't be probed.
    return { values, error: "Incorrect email or password." };
  }

  redirect(safeRedirectPath(formData.get("next")));
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
