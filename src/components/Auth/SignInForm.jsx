"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { signInAction } from "@/lib/actions/auth";

export default function SignInForm({ next }) {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError message={state.error} />
      <TextField id="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <div>
        <TextField id="password" label="Password" type="password" autoComplete="current-password" required />
        <Link href="/forgot-password" className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-200">
          Forgot password?
        </Link>
      </div>
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
