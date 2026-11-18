"use client";

// The expense form. onSubmitting(formData) runs first (for optimistic UI), then the Server Action.
import { useActionState } from "react";
import AuthField, { FormError, FormSuccess, SelectField } from "@/components/Auth/AuthField";
import { addExpenseAction } from "@/lib/actions/expenses";

export default function AddExpenseForm({ categories, members, currentUserId, today, onSubmitting }) {
  const [state, formAction, pending] = useActionState(
    async (previous, formData) => {
      onSubmitting(formData);
      return addExpenseAction(previous, formData);
    },
    { values: { paidByUserId: currentUserId } },
  );
  const values = state.values ?? {};

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-6" noValidate>
      <div className="space-y-3 md:col-span-6">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <div className="md:col-span-3">
        <AuthField
          id="expense-title"
          name="title"
          label="Expense"
          placeholder="School supplies"
          maxLength={120}
          defaultValue={values.title}
          error={state.errors?.title}
        />
      </div>
      <div className="md:col-span-1">
        <AuthField
          id="expense-amount"
          name="amount"
          label="Amount"
          inputMode="decimal"
          placeholder="45"
          defaultValue={values.amount}
          error={state.errors?.amount}
        />
      </div>
      <div className="md:col-span-2">
        <AuthField
          // Re-mount so a kept date survives React's reset of the form after a successful submit.
          key={`date-${values.spentOn}`}
          id="expense-date"
          name="spentOn"
          label="Date"
          type="date"
          max={today}
          defaultValue={values.spentOn || today}
          error={state.errors?.spentOn}
        />
      </div>
      <div className="md:col-span-3">
        <SelectField
          key={`category-${values.categoryId}`}
          id="expense-category"
          name="categoryId"
          label="Category"
          defaultValue={values.categoryId ?? ""}
          error={state.errors?.categoryId}
        >
          <option value="" disabled>
            Choose…
          </option>
          {categories.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="md:col-span-3">
        <SelectField
          key={`payer-${values.paidByUserId}`}
          id="expense-payer"
          name="paidByUserId"
          label="Paid by"
          defaultValue={values.paidByUserId ?? ""}
          error={state.errors?.paidByUserId}
        >
          <option value="">Not set</option>
          {members.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </SelectField>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60 md:col-span-6"
      >
        {pending ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
