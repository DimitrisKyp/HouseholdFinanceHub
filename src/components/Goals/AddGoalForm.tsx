"use client";

import { useActionState } from "react";
import TextField, { FormError, FormSuccess } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { addGoalAction } from "@/lib/actions/goals";
import { buttonClasses } from "@/components/ui/Button";

/** minDate: the earliest target date allowed ("YYYY-MM-DD"), usually today. */
export default function AddGoalForm({ minDate }: { minDate: string }) {
  const [state, formAction, pending] = useActionState(addGoalAction, {});
  const values = state.values ?? {};
  const t = useTranslations("goals");

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
          label={t("form.name")}
          placeholder={t("form.namePlaceholder")}
          maxLength={120}
          defaultValue={values.name}
          error={state.errors?.name}
        />
      </div>
      <TextField
        id="goal-target"
        name="targetAmount"
        label={t("form.target")}
        inputMode="decimal"
        placeholder="5000"
        defaultValue={values.targetAmount}
        error={state.errors?.targetAmount}
      />
      <TextField
        id="goal-date"
        name="targetDate"
        label={t("form.date")}
        type="date"
        min={minDate}
        defaultValue={values.targetDate}
        error={state.errors?.targetDate}
      />
      <div className="md:col-span-2">
        <TextField
          id="goal-note"
          name="note"
          label={t("form.note")}
          placeholder={t("form.notePlaceholder")}
          maxLength={500}
          defaultValue={values.note}
          error={state.errors?.note}
        />
      </div>
      <TextField
        id="goal-starting"
        name="startingAmount"
        label={t("form.starting")}
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
        {pending ? t("form.adding") : t("form.add")}
      </button>
    </form>
  );
}
