// Shared form-input helpers for Server Actions.

export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How long someone must wait before asking for another email (confirmation, reset). */
export const EMAIL_COOLDOWN_MS = 60 * 1000;

/** A trimmed text field from a FormData ("" if missing). */
export const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** A password field, untrimmed (spaces are allowed in passwords). */
export const passwordField = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** Error message per form field name, e.g. { email: "Enter a valid email." }. */
export type FieldErrors = Record<string, string>;

/**
 * What a Server Action used with useActionState returns to its form (and receives back as the
 * previous state). Every field is optional: a form shows whichever ones are set.
 * - error: one message for the whole form; success: a confirmation message
 * - errors: a message per field; values: what was typed, to refill the form after a round trip
 * Actions with extra fields (e.g. `sent`) intersect this: `FormState<{ email: string }> & { sent?: boolean }`.
 */
export type FormState<Values extends object = Record<string, string>> = {
  error?: string;
  success?: string;
  errors?: FieldErrors;
  values?: Values;
};

/** Field errors for a new password + its confirmation ({} if both are fine). */
export function newPasswordErrors(password: string, confirmPassword: string, passwordKey = "password"): FieldErrors {
  const errors: FieldErrors = {};
  if (password.length < MIN_PASSWORD_LENGTH) errors[passwordKey] = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (password.length > 128) errors[passwordKey] = "Use at most 128 characters.";
  if (password !== confirmPassword) errors.confirmPassword = "The passwords don't match.";
  return errors;
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a Postgres unique-constraint error (also when wrapped by Drizzle). */
export const isUniqueViolation = (error: unknown) => (errorCode(errorCause(error)) ?? errorCode(error)) === "23505";

/** True for a Postgres foreign-key error (also when wrapped by Drizzle), e.g. a row still referenced. */
export const isForeignKeyViolation = (error: unknown) => (errorCode(errorCause(error)) ?? errorCode(error)) === "23503";

/**
 * Type guard: the value is one of `options`, e.g. a frequency picked in a form's <select>.
 * After `if (isOneOf(FREQUENCIES, raw))`, TypeScript knows raw is a Frequency, not just a string.
 */
export const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  (options as readonly unknown[]).includes(value);

// `catch` gives `unknown`: check it's an object with the property before reading it.
function errorCode(value: unknown) {
  return value && typeof value === "object" && "code" in value ? value.code : undefined;
}
function errorCause(value: unknown) {
  return value && typeof value === "object" && "cause" in value ? value.cause : undefined;
}

/**
 * A money amount typed by a person ("12", "12.5", "1,250.00" or "12,50") as a number with at most
 * 2 decimals, or null if it isn't one. Fits the numeric(12,2) columns. Zero and negatives are
 * rejected unless allowed.
 */
export function parseAmount(
  raw: unknown,
  { allowZero = false, allowNegative = false }: { allowZero?: boolean; allowNegative?: boolean } = {},
): number | null {
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
export function parseDate(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid && year >= 2000 && year <= 2100 ? text : null;
}
