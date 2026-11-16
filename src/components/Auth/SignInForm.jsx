"use client";

import Link from "next/link";
import { useActionState } from "react";
import AuthField, { FormError, SubmitButton } from "@/components/Auth/AuthField";
import { signInAction } from "@/lib/actions/auth";

export default function SignInForm({ next }) {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError message={state.error} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <AuthField id="password" label="Password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending} pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        New here?{" "}
        <Link href="/sign-up" className="text-cyan-300 hover:text-cyan-200">
          Create an account
        </Link>
      </p>
    </form>
  );
}
