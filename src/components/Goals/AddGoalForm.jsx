"use client";

import { useActionState } from "react";
import TextField, { FormError, FormSuccess } from "@/components/ui/Field";
import { addGoalAction } from "@/lib/actions/goals";
import { buttonClasses } from "@/components/ui/Button";

export default function AddGoalForm({ minDate }) {
  const [state, formAction, pending] = useActionState(addGoalAction, {});
  const values = state.values ?? {};

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-4" noValidate>
      <div className="space-y-3 md:col-span-4">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <div className="md:col-span-2">
        <TextField
          id="goal-name"
          name="name"
          label="Goal"
          placeholder="Emergency fund"
          maxLength={120}
          defaultValue={values.name}
          error={state.errors?.name}
        />
      </div>
      <TextField
        id="goal-target"
        name="targetAmount"
        label="Target amount"
        inputMode="decimal"
        placeholder="5000"
        defaultValue={values.targetAmount}
        error={state.errors?.targetAmount}
      />
      <TextField
        id="goal-date"
        name="targetDate"
        label="Target date (optional)"
        type="date"
        min={minDate}
        defaultValue={values.targetDate}
        error={state.errors?.targetDate}
      />
      <div className="md:col-span-2">
        <TextField
          id="goal-note"
          name="note"
          label="Note (optional)"
          placeholder="Three months of household expenses"
          maxLength={500}
          defaultValue={values.note}
          error={state.errors?.note}
        />
      </div>
      <TextField
        id="goal-starting"
        name="startingAmount"
        label="Already saved (optional)"
        inputMode="decimal"
        placeholder="0"
        defaultValue={values.startingAmount}
        error={state.errors?.startingAmount}
      />
      <button
        type="submit"
        disabled={pending}
        className={buttonClasses({ variant: "primary", size: "md", className: "self-start md:mt-6" })}
      >
        {pending ? "Adding…" : "Add goal"}
      </button>
    </form>
  );
}
