"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/Button";
import TextField, { FormError, FormSuccess } from "@/components/ui/Field";
import { updateProfileAction } from "@/lib/actions/account";

export default function ProfileForm({ name, email }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, { values: { name } });

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <TextField
        id="name"
        label="Your name"
        autoComplete="name"
        maxLength={100}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <TextField id="profile-email" label="Email" value={email} readOnly disabled hint="Used to sign in. It can't be changed yet." />
      <SubmitButton pending={pending} pendingText="Saving…" block={false} size="sm">
        Save name
      </SubmitButton>
    </form>
  );
}
