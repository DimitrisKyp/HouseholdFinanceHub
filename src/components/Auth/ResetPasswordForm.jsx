"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/actions/password";
import { buttonClasses } from "@/components/ui/Button";

export default function ResetPasswordForm({ token }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  if (state.linkInvalid) {
    return (
      <div className="space-y-4">
        <FormError message={state.error} />
        <Link href="/forgot-password" className={buttonClasses({ variant: "primary", size: "md", block: true })}>
          Get a new link
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
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state.errors?.password}
      />
      <TextField
        id="confirmPassword"
        label="Repeat new password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <SubmitButton pending={pending} pendingText="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
