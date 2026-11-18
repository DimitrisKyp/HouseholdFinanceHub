"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { requestPasswordResetAction } from "@/lib/actions/password";

export default function ForgotPasswordForm({ email }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.error} />
      {state.sent ? (
        <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          If there’s an account for <span className="font-medium">{state.values.email}</span>, we’ve sent it a reset link. It works for 1
          hour.
        </p>
      ) : null}
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? email}
        error={state.errors?.email}
      />
      <SubmitButton pending={pending} pendingText="Sending…">
        {state.sent ? "Send again" : "Send reset link"}
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        Remembered it?{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </p>
    </form>
  );
}
