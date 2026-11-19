"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/actions/password";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";

export default function ResetPasswordForm({ token }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});
  const t = useTranslations("auth");
  const common = useTranslations("common");

  if (state.linkInvalid) {
    return (
      <div className="space-y-4">
        <FormError message={state.error} />
        <Link href="/forgot-password" className={buttonClasses({ variant: "primary", size: "md", block: true })}>
          {t("getNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <TextField
        id="password"
        label={t("fields.newPassword")}
        type="password"
        autoComplete="new-password"
        required
        hint={t("fields.passwordHint")}
        error={state.errors?.password}
      />
      <TextField
        id="confirmPassword"
        label={t("fields.repeatNewPassword")}
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <SubmitButton pending={pending} pendingText={common("saving")}>
        {t("reset.submit")}
      </SubmitButton>
    </form>
  );
}
