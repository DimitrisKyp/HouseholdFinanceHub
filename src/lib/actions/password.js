"use server";

// Server Actions for forgot / reset / change password.
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import { sendPasswordChangedEmail, siteUrl } from "@/lib/email";
import { EMAIL_COOLDOWN_MS, EMAIL_PATTERN, field, newPasswordErrors, passwordField } from "@/lib/forms";
import { isTooSoon, withMinimumDuration } from "@/lib/throttle";

/** "Forgot password": emails a reset link if the account exists. Always answers the same way. */
export async function requestPasswordResetAction(_previousState, formData) {
  const values = { email: field(formData, "email").toLowerCase() };
  if (!EMAIL_PATTERN.test(values.email)) {
    return { values, errors: { email: "Enter a valid email address." } };
  }
  if (isTooSoon(`reset:${values.email}`, EMAIL_COOLDOWN_MS)) {
    return { values, error: "We just sent one. Please wait a minute before asking again." };
  }

  try {
    // The email link goes through Better Auth, which checks it and forwards to /reset-password.
    await withMinimumDuration(1500, () =>
      auth.api.requestPasswordReset({ body: { email: values.email, redirectTo: "/reset-password" } }),
    );
  } catch (error) {
    console.error("Password reset request failed", error);
    return { values, error: "We couldn't send the email. Please try again later." };
  }

  return { values, sent: true };
}

/** Sets a new password using the token from the reset link. */
export async function resetPasswordAction(_previousState, formData) {
  const token = field(formData, "token");
  const password = passwordField(formData, "password");
  const errors = newPasswordErrors(password, passwordField(formData, "confirmPassword"));
  if (!token) return { error: "This reset link isn't valid.", linkInvalid: true };
  if (Object.keys(errors).length) return { errors };

  try {
    // Also signs out every device and (via onPasswordReset) emails a security notice.
    await auth.api.resetPassword({ body: { token, newPassword: password } });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_TOKEN") {
      return { error: "This reset link has expired or has already been used.", linkInvalid: true };
    }
    console.error("Password reset failed", error);
    return { error: "We couldn't change your password. Please try again." };
  }

  redirect("/sign-in?reset=1");
}

/** Signed-in password change. Needs the current password. */
export async function changePasswordAction(_previousState, formData) {
  const user = await requireUser();
  const currentPassword = passwordField(formData, "currentPassword");
  const newPassword = passwordField(formData, "newPassword");
  const signOutOthers = formData.get("signOutOthers") === "on";

  const errors = newPasswordErrors(newPassword, passwordField(formData, "confirmPassword"), "newPassword");
  if (!currentPassword) errors.currentPassword = "Enter your current password.";
  else if (!errors.newPassword && newPassword === currentPassword) {
    errors.newPassword = "Choose a password different from your current one.";
  }
  if (Object.keys(errors).length) return { errors, signOutOthers };

  try {
    // With revokeOtherSessions, every session is deleted and this browser gets a new one.
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: signOutOthers },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      return { errors: { currentPassword: "That's not your current password." }, signOutOthers };
    }
    console.error("Changing password failed", error);
    return { error: "We couldn't change your password. Please try again.", signOutOthers };
  }

  try {
    await sendPasswordChangedEmail({ to: user.email, name: user.name, url: siteUrl("/forgot-password") });
  } catch (error) {
    console.error("Password-changed email failed", error);
  }

  return {
    success: signOutOthers
      ? "Password changed. Other devices have been signed out."
      : "Password changed.",
    signOutOthers,
  };
}
