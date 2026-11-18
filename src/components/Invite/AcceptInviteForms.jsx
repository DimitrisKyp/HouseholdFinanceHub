"use client";

import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { acceptInviteAction, acceptInviteWithNewAccountAction } from "@/lib/actions/members";

/** New person: the invited email is fixed; they pick a name and password. */
export function NewAccountInviteForm({ token, email }) {
  const [state, formAction, pending] = useActionState(acceptInviteWithNewAccountAction, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <TextField id="invitedEmail" label="Email" type="email" value={email} readOnly disabled hint="The address you were invited with." />
      <TextField id="name" label="Your name" autoComplete="name" required defaultValue={state.values?.name} error={state.errors?.name} />
      <TextField
        id="password"
        label="Choose a password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state.errors?.password}
      />
      <TextField
        id="confirmPassword"
        label="Repeat password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <SubmitButton pending={pending} pendingText="Joining…">
        Create account and join
      </SubmitButton>
    </form>
  );
}

/** Already signed in with the invited email: one click to join. */
export function AcceptInviteButton({ token, householdName }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <SubmitButton pending={pending} pendingText="Joining…">
        Join {householdName}
      </SubmitButton>
    </form>
  );
}
