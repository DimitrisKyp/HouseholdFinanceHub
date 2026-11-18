"use client";

import Link from "next/link";
import { useActionState } from "react";
import TextField, { FormError } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { signUpAction } from "@/lib/actions/auth";

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <TextField id="name" label="Your name" autoComplete="name" required defaultValue={state.values?.name} error={errors.name} />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={errors.email}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={errors.password}
      />
      <TextField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <TextField
        id="householdName"
        label="Household name"
        placeholder="Our home"
        required
        hint="You'll be its owner and can invite family members later."
        defaultValue={state.values?.householdName}
        error={errors.householdName}
      />
      <SubmitButton pending={pending} pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </p>
    </form>
  );
}
