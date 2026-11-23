"use client";

import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { acceptInviteAction, acceptInviteWithNewAccountAction } from "@/lib/actions/members";
import { useTranslations } from "@/i18n/client";

/** New person: the invited email is fixed; they pick a name and password. */
export function NewAccountInviteForm({ token, email }) {
  const [state, formAction, pending] = useActionState(acceptInviteWithNewAccountAction, {});
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <TextField
        id="invitedEmail"
        label={t("fields.email")}
        type="email"
        value={email}
        readOnly
        disabled
        hint={t("fields.invitedEmailHint")}
      />
      <TextField
        id="name"
        label={t("fields.yourName")}
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <TextField
        id="password"
        label={t("fields.choosePassword")}
        type="password"
        autoComplete="new-password"
        required
        hint={t("fields.passwordHint")}
        error={state.errors?.password}
      />
      <TextField
        id="confirmPassword"
        label={t("fields.repeatPassword")}
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <SubmitButton pending={pending} pendingText={t("invite.joining")}>
        {t("invite.createAndJoin")}
      </SubmitButton>
    </form>
  );
}

/** Already signed in with the invited email: one click to join. */
export function AcceptInviteButton({ token, householdName }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, {});
  const t = useTranslations("auth");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <SubmitButton pending={pending} pendingText={t("invite.joining")}>
        {t("invite.join", { household: householdName })}
      </SubmitButton>
    </form>
  );
}
