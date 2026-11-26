"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/Button";
import TextField, { FormError, FormSuccess } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { updateProfileAction } from "@/lib/actions/account";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, { values: { name } });
  const t = useTranslations("account");
  const common = useTranslations("common");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <TextField
        id="name"
        label={t("profile.name")}
        autoComplete="name"
        maxLength={100}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <TextField id="profile-email" label={t("profile.email")} value={email} readOnly disabled hint={t("profile.emailHint")} />
      <SubmitButton pending={pending} pendingText={common("saving")} block={false} size="sm">
        {t("profile.save")}
      </SubmitButton>
    </form>
  );
}
