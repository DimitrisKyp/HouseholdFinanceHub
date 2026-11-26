"use client";

// The expense form. onSubmitting(formData) runs first (for optimistic UI), then the Server Action.
import { useActionState } from "react";
import type { CategoryOption, MemberOption } from "@/components/Budget/RecurringItemsPanel";
import TextField, { FormError, FormSuccess, SelectField } from "@/components/ui/Field";
import { addExpenseAction, type ExpenseFormState } from "@/lib/actions/expenses";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";

export type AddExpenseFormProps = {
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  /** Today in the household's time zone ("YYYY-MM-DD"): the default and latest date. */
  today: string;
  /** Called with the submitted form before the Server Action runs (for optimistic UI). */
  onSubmitting: (formData: FormData) => void;
};

export default function AddExpenseForm({ categories, members, currentUserId, today, onSubmitting }: AddExpenseFormProps) {
  const [state, formAction, pending] = useActionState(
    async (previous: ExpenseFormState, formData: FormData) => {
      onSubmitting(formData);
      return addExpenseAction(previous, formData);
    },
    { values: { paidByUserId: currentUserId } },
  );
  const values = state.values ?? {};
  const t = useTranslations("dashboard");

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-6" noValidate>
      <div className="space-y-3 md:col-span-6">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <div className="md:col-span-3">
        <TextField
          id="expense-title"
          name="title"
          label={t("form.expense")}
          placeholder={t("form.expensePlaceholder")}
          maxLength={120}
          defaultValue={values.title}
          error={state.errors?.title}
        />
      </div>
      <div className="md:col-span-1">
        <TextField
          id="expense-amount"
          name="amount"
          label={t("form.amount")}
          inputMode="decimal"
          placeholder="45"
          defaultValue={values.amount}
          error={state.errors?.amount}
        />
      </div>
      <div className="md:col-span-2">
        <TextField
          // Re-mount so a kept date survives React's reset of the form after a successful submit.
          key={`date-${values.spentOn}`}
          id="expense-date"
          name="spentOn"
          label={t("form.date")}
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
          label={t("form.category")}
          defaultValue={values.categoryId ?? ""}
          error={state.errors?.categoryId}
        >
          <option value="" disabled>
            {t("form.choose")}
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
          label={t("form.paidBy")}
          defaultValue={values.paidByUserId ?? ""}
          error={state.errors?.paidByUserId}
        >
          <option value="">{t("form.notSet")}</option>
          {members.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </SelectField>
      </div>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md", className: "md:col-span-6" })}>
        {pending ? t("form.adding") : t("form.add")}
      </button>
    </form>
  );
}
