"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { changePasswordAction } from "@/lib/actions/password";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, { signOutOthers: true });

  return (
    // React clears the password fields after each submit; the checkbox keeps the last choice.
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.error} />
      {state.success ? (
        <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {state.success}
        </p>
      ) : null}
      <div>
        <TextField
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          error={state.errors?.currentPassword}
        />
        <Link href="/forgot-password" className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-200">
          Forgot it?
        </Link>
      </div>
      <TextField
        id="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state.errors?.newPassword}
      />
      <TextField
        id="confirmPassword"
        label="Repeat new password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" name="signOutOthers" defaultChecked={state.signOutOthers} className="mt-0.5 h-4 w-4 accent-cyan-400" />
        <span>
          Sign out of all other devices
          <span className="block text-xs text-slate-500">Recommended if you think someone else knows your password.</span>
        </span>
      </label>
      <SubmitButton pending={pending} pendingText="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
