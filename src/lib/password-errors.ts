// newPasswordErrors (lib/forms.ts) with its messages in the visitor's language.
import type { Translator } from "@/i18n/translate";
import { MIN_PASSWORD_LENGTH, newPasswordErrors } from "@/lib/forms";

const MAX_PASSWORD_LENGTH = 128;

/** Same checks as newPasswordErrors; t is getTranslations("auth"). */
export function translatedPasswordErrors(t: Translator, password: string, confirmPassword: string, passwordKey = "password") {
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
