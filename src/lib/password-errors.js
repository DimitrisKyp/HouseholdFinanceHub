// newPasswordErrors (lib/forms.js) with its messages in the visitor's language.
import { MIN_PASSWORD_LENGTH, newPasswordErrors } from "@/lib/forms";

const MAX_PASSWORD_LENGTH = 128;

/** Same checks as newPasswordErrors; t is getTranslations("auth"). */
export function translatedPasswordErrors(t, password, confirmPassword, passwordKey = "password") {
  const errors = newPasswordErrors(password, confirmPassword, passwordKey);
  if (errors[passwordKey]) {
    errors[passwordKey] =
      password.length < MIN_PASSWORD_LENGTH
        ? t("errors.passwordTooShort", { min: MIN_PASSWORD_LENGTH })
        : t("errors.passwordTooLong", { max: MAX_PASSWORD_LENGTH });
  }
  if (errors.confirmPassword) errors.confirmPassword = t("errors.passwordMismatch");
  return errors;
}
