"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { requestPasswordResetAction } from "@/lib/actions/password";
import { rich } from "@/components/Auth/rich";
import { useTranslations } from "@/i18n/client";

export default function ForgotPasswordForm({ email }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, {});
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.error} />
      {state.sent ? (
        <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {rich(t("forgot.sent"), { email: <span className="font-medium">{state.values.email}</span> })}
        </p>
      ) : null}
      <TextField
        id="email"
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? email}
        error={state.errors?.email}
      />
      <SubmitButton pending={pending} pendingText={t("sending")}>
        {state.sent ? t("forgot.sendAgain") : t("forgot.submit")}
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        {t("forgot.remembered")}{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
