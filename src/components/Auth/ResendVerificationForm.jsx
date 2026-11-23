"use client";

import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { resendVerificationAction } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

// "Send the confirmation email again". If the address is known, it's a hidden field;
// otherwise the user types it in.
export default function ResendVerificationForm({ email }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, {});
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <TextField id="email" label={t("fields.email")} type="email" autoComplete="email" required />
      )}
      <FormError message={state.error} />
      {state.sent ? (
        <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {t("resend.sent")}
        </p>
      ) : null}
      <SubmitButton pending={pending} pendingText={t("sending")}>
        {t("resend.submit")}
      </SubmitButton>
    </form>
  );
}
