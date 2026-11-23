"use client";

// Recurring income (salary, side income) or recurring bills (rent, subscriptions) for the budget page.
import { useActionState } from "react";
import TextField, { FormError, FormSuccess, InlineMessage, SelectField } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";
import { addRecurringItemAction, deleteRecurringItemAction, updateBillCategoryAction } from "@/lib/actions/budget";

const FREQUENCIES = ["monthly", "weekly", "yearly"];

// Texts per type are under recurring.income / recurring.expense in the "budget" messages.
const COPY = {
  income: { amountPlaceholder: "2400", button: "success", amountColor: "text-emerald-200" },
  expense: { amountPlaceholder: "850", button: "danger", amountColor: "text-rose-200" },
};

function AddItemForm({ type, categories, members }) {
  const copy = COPY[type];
  const [state, formAction, pending] = useActionState(addRecurringItemAction, { values: { frequency: "monthly" } });
  const values = state.values ?? {};
  const prefix = `${type}-`;
  const t = useTranslations("budget");
  const common = useTranslations("common");

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2" noValidate>
      <input type="hidden" name="type" value={type} />
      <div className="space-y-3 md:col-span-2">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <TextField
        id={`${prefix}title`}
        name="title"
        label={t(`recurring.${type}.titleLabel`)}
        placeholder={t(`recurring.${type}.titlePlaceholder`)}
        maxLength={120}
        defaultValue={values.title}
        error={state.errors?.title}
      />
      <TextField
        id={`${prefix}amount`}
        name="amount"
        label={t("recurring.amount")}
        inputMode="decimal"
        placeholder={copy.amountPlaceholder}
        defaultValue={values.amount}
        error={state.errors?.amount}
      />
      <SelectField
        key={`frequency-${values.frequency}`}
        id={`${prefix}frequency`}
        name="frequency"
        label={t("recurring.howOften")}
        defaultValue={values.frequency ?? "monthly"}
        error={state.errors?.frequency}
      >
        {FREQUENCIES.map(value => (
          <option key={value} value={value}>
            {t(`recurring.frequencies.${value}`)}
          </option>
        ))}
      </SelectField>
      {type === "expense" ? (
        <SelectField
          key={`category-${values.categoryId}`}
          id={`${prefix}category`}
          name="categoryId"
          label={t("recurring.category")}
          defaultValue={values.categoryId ?? ""}
          error={state.errors?.categoryId}
        >
          <option value="" disabled>
            {t("recurring.choose")}
          </option>
          {categories.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <SelectField
          key={`member-${values.memberUserId}`}
          id={`${prefix}member`}
          name="memberUserId"
          label={t("recurring.whoseIncome")}
          defaultValue={values.memberUserId ?? ""}
          error={state.errors?.memberUserId}
        >
          <option value="">{t("recurring.shared")}</option>
          {members.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </SelectField>
      )}
      <button type="submit" disabled={pending} className={buttonClasses({ variant: copy.button, className: "md:col-span-2" })}>
        {pending ? common("saving") : t(`recurring.${type}.submit`)}
      </button>
    </form>
  );
}

const smallButton =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:opacity-60";

// Change which category a bill belongs to: logged expenses in that category count against it.
function BillCategoryForm({ item, categories, formAction, pending }) {
  const t = useTranslations("budget");
  // An archived category isn't in the list; keep it selectable so the form shows the truth.
  const options =
    categories.some(category => category.id === item.categoryId) || !item.categoryId
      ? categories
      : [...categories, { id: item.categoryId, name: item.categoryName ?? t("recurring.archivedCategory") }];
  return (
    <form action={formAction} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="itemId" value={item.id} />
      <label className="text-xs text-slate-400" htmlFor={`bill-category-${item.id}`}>
        {t("recurring.category")}
        <span className="sr-only">{t("recurring.categoryFor", { title: item.title })}</span>
      </label>
      <select
        id={`bill-category-${item.id}`}
        name="categoryId"
        defaultValue={item.categoryId ?? ""}
        className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
      >
        {item.categoryId ? null : (
          <option value="" disabled>
            {t("recurring.choose")}
          </option>
        )}
        {options.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} aria-label={t("recurring.saveCategoryFor", { title: item.title })} className={smallButton}>
        {pending ? "…" : t("recurring.save")}
      </button>
    </form>
  );
}

function ItemRow({ item, canEdit, amountColor, categories }) {
  const [state, formAction, pending] = useActionState(deleteRecurringItemAction, {});
  const [categoryState, categoryAction, categoryPending] = useActionState(updateBillCategoryAction, {});
  const t = useTranslations("budget");

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.title}</p>
          <p className="truncate text-sm text-slate-400">{item.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className={`font-semibold ${amountColor}`}>{item.amountLabel}</p>
            {item.monthlyLabel ? (
              <p className="text-xs text-slate-500">{t("recurring.monthlyEquivalent", { amount: item.monthlyLabel })}</p>
            ) : null}
          </div>
          {canEdit ? (
            <form
              action={formAction}
              onSubmit={event => {
                if (!window.confirm(t("recurring.confirmRemove", { title: item.title }))) event.preventDefault();
              }}
            >
              <input type="hidden" name="itemId" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                aria-label={t("recurring.removeItem", { title: item.title })}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
              >
                {pending ? "…" : t("recurring.remove")}
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {canEdit && categories ? (
        <BillCategoryForm item={item} categories={categories} formAction={categoryAction} pending={categoryPending} />
      ) : null}
      <InlineMessage state={state.error ? state : categoryState.error || categoryState.success ? categoryState : null} />
    </li>
  );
}

export default function RecurringItemsPanel({ type, title, subtitle, totalLabel, items, categories = [], members = [], canEdit }) {
  const copy = COPY[type];
  const t = useTranslations("budget");

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-semibold ${copy.amountColor}`}>{totalLabel}</p>
          <p className="text-xs text-slate-500">{t("recurring.perMonth")}</p>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-4">
          <AddItemForm type={type} categories={categories} members={members} />
        </div>
      ) : null}

      {items.length ? (
        <ul className="mt-4 space-y-2">
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              amountColor={copy.amountColor}
              categories={type === "expense" ? categories : null}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{t(`recurring.${type}.empty`)}</p>
      )}
    </section>
  );
}
