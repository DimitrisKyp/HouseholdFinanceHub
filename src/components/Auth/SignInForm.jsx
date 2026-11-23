"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import PasswordField from "@/components/ui/PasswordField";
import { signInAction } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function SignInForm({ next }) {
  const [state, formAction, pending] = useActionState(signInAction, {});
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError message={state.error} />
      <TextField id="email" label={t("fields.email")} type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <div>
        <PasswordField id="password" label={t("fields.password")} autoComplete="current-password" required />
        <Link href="/forgot-password" className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-200">
          {t("signInPage.forgot")}
        </Link>
      </div>
      <SubmitButton pending={pending} pendingText={t("signInPage.signingIn")}>
        {t("signIn")}
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        {t("signInPage.newHere")}{" "}
        <Link href="/sign-up" className="text-cyan-300 hover:text-cyan-200">
          {t("signInPage.createAccount")}
        </Link>
      </p>
    </form>
  );
}
