"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import PasswordField from "@/components/ui/PasswordField";
import { signUpAction } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, {});
  const errors = state.errors ?? {};
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <TextField
        id="name"
        label={t("fields.yourName")}
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={errors.name}
      />
      <TextField
        id="email"
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={errors.email}
      />
      <PasswordField
        id="password"
        label={t("fields.password")}
        autoComplete="new-password"
        required
        hint={t("fields.passwordHint")}
        error={errors.password}
      />
      <PasswordField
        id="confirmPassword"
        label={t("fields.confirmPassword")}
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <TextField
        id="householdName"
        label={t("fields.householdName")}
        placeholder={t("fields.householdPlaceholder")}
        required
        hint={t("signUpPage.householdHint")}
        defaultValue={state.values?.householdName}
        error={errors.householdName}
      />
      <SubmitButton pending={pending} pendingText={t("signUpPage.creating")}>
        {t("signUpPage.submit")}
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        {t("signUpPage.haveAccount")}{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
