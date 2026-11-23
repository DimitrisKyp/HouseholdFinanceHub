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

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a Postgres unique-constraint error (also when wrapped by Drizzle). */
export const isUniqueViolation = error => (error?.cause?.code ?? error?.code) === "23505";

/**
 * A money amount typed by a person ("12", "12.5", "1,250.00" or "12,50") as a number with at most
 * 2 decimals, or null if it isn't one. Fits the numeric(12,2) columns. Zero and negatives are
 * rejected unless allowed.
 */
export function parseAmount(raw, { allowZero = false, allowNegative = false } = {}) {
  let text = String(raw ?? "").replace(/\s/g, "");
  // "1,250.00" → thousands separator; "12,50" → decimal comma.
  text = text.includes(".") ? text.replace(/,/g, "") : text.replace(",", ".");
  const match = /^(-?)(\d{1,10})(\.\d{1,2})?$/.exec(text);
  if (!match) return null;
  const value = Number(text);
  if (value < 0 && !allowNegative) return null;
  if (value === 0 && !allowZero) return null;
  return value;
}

/** A "YYYY-MM-DD" date field that is a real calendar date, or null. */
export function parseDate(raw) {
  const text = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid && year >= 2000 && year <= 2100 ? text : null;
}
