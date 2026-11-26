"use client";

import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { createHouseholdAction, signOutAction } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function CreateHouseholdForm() {
  const [state, formAction, pending] = useActionState(createHouseholdAction, {});
  const t = useTranslations("auth");

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        <FormError message={state.error} />
        <TextField
          id="householdName"
          label={t("fields.householdName")}
          placeholder={t("fields.householdPlaceholder")}
          required
          defaultValue={state.values?.householdName}
          error={state.errors?.householdName}
        />
        <SubmitButton pending={pending} pendingText={t("onboarding.creating")}>
          {t("onboarding.submit")}
        </SubmitButton>
      </form>
      <form action={signOutAction}>
        <button type="submit" className="w-full text-center text-sm text-slate-400 hover:text-white">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
