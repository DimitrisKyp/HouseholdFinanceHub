"use client";

import Link from "next/link";
import { useActionState } from "react";
import AuthField, { FormError, SubmitButton } from "@/components/Auth/AuthField";
import { resetPasswordAction } from "@/lib/actions/password";

export default function ResetPasswordForm({ token }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  if (state.linkInvalid) {
    return (
      <div className="space-y-4">
        <FormError message={state.error} />
        <Link
          href="/forgot-password"
          className="block w-full rounded-xl bg-cyan-500 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <AuthField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state.errors?.password}
      />
      <AuthField
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
