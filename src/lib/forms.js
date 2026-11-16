// Shared form-input helpers for Server Actions.

export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How long someone must wait before asking for another email (confirmation, reset). */
export const EMAIL_COOLDOWN_MS = 60 * 1000;

/** A trimmed text field from a FormData ("" if missing). */
export const field = (formData, key) => String(formData.get(key) ?? "").trim();

/** A password field, untrimmed (spaces are allowed in passwords). */
export const passwordField = (formData, key) => String(formData.get(key) ?? "");

/** Field errors for a new password + its confirmation ({} if both are fine). */
export function newPasswordErrors(password, confirmPassword, passwordKey = "password") {
  const errors = {};
  if (password.length < MIN_PASSWORD_LENGTH) errors[passwordKey] = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (password.length > 128) errors[passwordKey] = "Use at most 128 characters.";
  if (password !== confirmPassword) errors.confirmPassword = "The passwords don't match.";
  return errors;
}
