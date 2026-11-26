"use client";

// Owner only: the household's name, the currency every amount is shown in, and its timezone
// (which decides when a day and a month start for budgets and alerts).
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/Button";
import TextField, { FormError, FormSuccess, SelectField } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { updateHouseholdAction, type HouseholdSettings } from "@/lib/actions/account";

type HouseholdSettingsFormProps = {
  household: HouseholdSettings;
  currencies: readonly string[];
  timezones: readonly string[];
};

export default function HouseholdSettingsForm({ household, currencies, timezones }: HouseholdSettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateHouseholdAction, { values: household });
  const values = state.values ?? household;
  const t = useTranslations("account");
  const common = useTranslations("common");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <TextField
        id="household-name"
        name="name"
        label={t("household.name")}
        maxLength={100}
        defaultValue={values.name}
        error={state.errors?.name}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          key={`currency-${values.currency}`}
          id="household-currency"
          name="currency"
          label={t("household.currency")}
          defaultValue={values.currency}
          error={state.errors?.currency}
        >
          {currencies.map(code => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField
          key={`timezone-${values.timezone}`}
          id="household-timezone"
          name="timezone"
          label={t("household.timezone")}
          defaultValue={values.timezone}
          error={state.errors?.timezone}
        >
          {timezones.map(zone => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="text-xs text-slate-400">{t("household.note")}</p>
      <SubmitButton pending={pending} pendingText={common("saving")} block={false} size="sm">
        {t("household.save")}
      </SubmitButton>
    </form>
  );
}
