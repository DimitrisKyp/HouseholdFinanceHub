"use client";

import { useActionState } from "react";
import AuthField, { FormError, SubmitButton } from "@/components/Auth/AuthField";
import { createHouseholdAction, signOutAction } from "@/lib/actions/auth";

export default function CreateHouseholdForm() {
  const [state, formAction, pending] = useActionState(createHouseholdAction, {});

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        <FormError message={state.error} />
        <AuthField
          id="householdName"
          label="Household name"
          placeholder="Our home"
          required
          defaultValue={state.values?.householdName}
          error={state.errors?.householdName}
        />
        <SubmitButton pending={pending} pendingText="Creating household…">
          Create household
        </SubmitButton>
      </form>
      <form action={signOutAction}>
        <button type="submit" className="w-full text-center text-sm text-slate-400 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}
