"use server";

// Server Actions for forgot / reset / change password.
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import { sendPasswordChangedEmail, siteUrl } from "@/lib/email";
import { getTranslations } from "@/i18n/server";
import { EMAIL_COOLDOWN_MS, EMAIL_PATTERN, field, passwordField, type FormState } from "@/lib/forms";
import { translatedPasswordErrors } from "@/lib/password-errors";
import { clientIp } from "@/lib/request";
import { blockedFor, clearAttempts, countAttempt, isTooSoon, LIMITS, tooManyMessage, withMinimumDuration } from "@/lib/throttle";

export type PasswordResetRequestState = FormState<{ email: string }> & { sent?: boolean };
export type ResetPasswordState = FormState & { linkInvalid?: boolean };
export type ChangePasswordState = FormState & { signOutOthers?: boolean };

/** "Forgot password": emails a reset link if the account exists. Always answers the same way. */
export async function requestPasswordResetAction(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const t = await getTranslations("auth");
  const values = { email: field(formData, "email").toLowerCase() };
  if (!EMAIL_PATTERN.test(values.email)) {
    return { values, errors: { email: t("errors.emailInvalid") } };
  }
  const ipKey = `reset-request:${await clientIp()}`;
  const wait = blockedFor(ipKey, LIMITS.resetRequestPerIp);
  if (wait) return { values, error: tooManyMessage(wait, t) };
  countAttempt(ipKey, LIMITS.resetRequestPerIp);
  if (isTooSoon(`reset:${values.email}`, EMAIL_COOLDOWN_MS)) {
    return { values, error: t("errors.justSent") };
  }

  try {
    // The email link goes through Better Auth, which checks it and forwards to /reset-password.
    await withMinimumDuration(1500, () => auth.api.requestPasswordReset({ body: { email: values.email, redirectTo: "/reset-password" } }));
  } catch (error) {
    console.error("Password reset request failed", error);
    return { values, error: t("errors.sendFailed") };
  }

  return { values, sent: true };
}

/** Sets a new password using the token from the reset link. */
export async function resetPasswordAction(_previousState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const t = await getTranslations("auth");
  const token = field(formData, "token");
  const password = passwordField(formData, "password");
  const errors = translatedPasswordErrors(t, password, passwordField(formData, "confirmPassword"));
  if (!token) return { error: t("errors.resetLinkInvalid"), linkInvalid: true };
  if (Object.keys(errors).length) return { errors };

  const ipKey = `reset:${await clientIp()}`;
  const wait = blockedFor(ipKey, LIMITS.resetPerIp);
  if (wait) return { error: tooManyMessage(wait, t) };
  countAttempt(ipKey, LIMITS.resetPerIp);

  try {
    // Also signs out every device and (via onPasswordReset) emails a security notice.
    await auth.api.resetPassword({ body: { token, newPassword: password } });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_TOKEN") {
      return { error: t("errors.resetLinkExpired"), linkInvalid: true };
    }
    console.error("Password reset failed", error);
    return { error: t("errors.changeFailed") };
  }

  redirect("/sign-in?reset=1");
}

/** Signed-in password change. Needs the current password. */
export async function changePasswordAction(_previousState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();
  const t = await getTranslations("auth");
  const currentPassword = passwordField(formData, "currentPassword");
  const newPassword = passwordField(formData, "newPassword");
  const signOutOthers = formData.get("signOutOthers") === "on";

  const errors = translatedPasswordErrors(t, newPassword, passwordField(formData, "confirmPassword"), "newPassword");
  if (!currentPassword) errors.currentPassword = t("errors.currentPasswordMissing");
  else if (!errors.newPassword && newPassword === currentPassword) {
    errors.newPassword = t("errors.samePassword");
  }
  if (Object.keys(errors).length) return { errors, signOutOthers };

  // Guessing the current password on an unlocked device is limited too.
  const userKey = `change-password:${user.id}`;
  const wait = blockedFor(userKey, LIMITS.changePasswordPerUser);
  if (wait) return { error: tooManyMessage(wait, t), signOutOthers };

  try {
    // With revokeOtherSessions, every session is deleted and this browser gets a new one.
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: signOutOthers },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      countAttempt(userKey, LIMITS.changePasswordPerUser);
      return { errors: { currentPassword: t("errors.currentPasswordWrong") }, signOutOthers };
    }
    console.error("Changing password failed", error);
    return { error: t("errors.changeFailed"), signOutOthers };
  }

  clearAttempts(userKey);
  try {
    await sendPasswordChangedEmail({ to: user.email, name: user.name, url: siteUrl("/forgot-password") });
  } catch (error) {
    console.error("Password-changed email failed", error);
  }

  return {
    success: signOutOthers ? t("passwordChangedSignedOut") : t("passwordChanged"),
    signOutOthers,
  };
}
