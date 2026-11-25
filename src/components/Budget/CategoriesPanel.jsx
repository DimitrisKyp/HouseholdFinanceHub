"use client";

// Spending categories with an optional monthly limit. Shared by expenses, recurring bills and budgets.
import { useActionState } from "react";
import TextField, { FormError, FormSuccess, InlineMessage } from "@/components/ui/Field";
import { addCategoryAction, deleteCategoryAction, setCategoryArchivedAction, updateCategoryLimitAction } from "@/lib/actions/budget";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslations } from "@/i18n/client";

const smallButton =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-60";

function ArchiveButton({ item, archive, onResult }) {
  const t = useTranslations("budget");
  return (
    <form action={onResult}>
      <input type="hidden" name="categoryId" value={item.id} />
      <input type="hidden" name="archived" value={String(archive)} />
      <button type="submit" className={`${smallButton} ${archive ? "hover:border-rose-400/50" : "hover:border-cyan-400/50"}`}>
        {archive ? t("categories.archive") : t("categories.restore")}
      </button>
    </form>
  );
}

// Only works for a category with no expenses; otherwise the server says to archive it instead.
function DeleteButton({ item, onResult }) {
  const t = useTranslations("budget");
  return (
    <form
      action={onResult}
      onSubmit={event => {
        if (!window.confirm(t("categories.confirmDelete", { name: item.name }))) event.preventDefault();
      }}
    >
      <input type="hidden" name="categoryId" value={item.id} />
      <button
        type="submit"
        aria-label={t("categories.deleteLabel", { name: item.name })}
        className={`${smallButton} hover:border-rose-400/50 hover:text-rose-200`}
      >
        {t("categories.delete")}
      </button>
    </form>
  );
}

function CategoryRow({ item, canEdit }) {
  const [limitState, limitAction, limitPending] = useActionState(updateCategoryLimitAction, {});
  const [archiveState, archiveAction] = useActionState(setCategoryArchivedAction, {});
  const [deleteState, deleteAction] = useActionState(deleteCategoryAction, {});
  const t = useTranslations("budget");
  let message = archiveState;
  if (limitState.error || limitState.success) message = limitState;
  else if (deleteState.error) message = deleteState;

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.name}</p>
          <p className="text-xs text-slate-500">
            {item.limitLabel ? t("categories.limit", { amount: item.limitLabel }) : t("categories.noLimit")}
          </p>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <form action={limitAction} className="flex items-center gap-2">
              <input type="hidden" name="categoryId" value={item.id} />
              <label className="sr-only" htmlFor={`limit-${item.id}`}>
                {t("categories.limitFor", { name: item.name })}
              </label>
              <input
                id={`limit-${item.id}`}
                name="monthlyLimit"
                inputMode="decimal"
                placeholder={t("categories.noLimitPlaceholder")}
                defaultValue={item.monthlyLimit ?? ""}
                className="w-24 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
              <button type="submit" disabled={limitPending} className={`${smallButton} hover:border-cyan-400/50`}>
                {limitPending ? "…" : t("categories.save")}
              </button>
            </form>
            <ArchiveButton item={item} archive onResult={archiveAction} />
            <DeleteButton item={item} onResult={deleteAction} />
          </div>
        ) : null}
      </div>
      <InlineMessage state={message} />
    </li>
  );
}

function ArchivedRow({ item }) {
  const [state, action] = useActionState(setCategoryArchivedAction, {});
  const [deleteState, deleteAction] = useActionState(deleteCategoryAction, {});
  const error = [state, deleteState].find(result => result.error);
  return (
    <li className="rounded-xl border border-white/5 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm text-slate-400">{item.name}</span>
        <div className="flex items-center gap-2">
          <ArchiveButton item={item} archive={false} onResult={action} />
          <DeleteButton item={item} onResult={deleteAction} />
        </div>
      </div>
      <InlineMessage state={error ?? null} />
    </li>
  );
}

function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategoryAction, {});
  const t = useTranslations("budget");

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-[1fr_10rem_auto] md:items-start" noValidate>
      <div className="space-y-3 md:col-span-3">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <TextField
        id="category-name"
        name="name"
        label={t("categories.newCategory")}
        placeholder={t("categories.namePlaceholder")}
        maxLength={50}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <TextField
        id="category-limit"
        name="monthlyLimit"
        label={t("categories.monthlyLimit")}
        inputMode="decimal"
        placeholder={t("categories.optional")}
        defaultValue={state.values?.monthlyLimit}
        error={state.errors?.monthlyLimit}
      />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md", className: "md:mt-6" })}>
        {pending ? t("categories.adding") : t("categories.add")}
      </button>
    </form>
  );
}

export default function CategoriesPanel({ categories, archived, canEdit }) {
  const t = useTranslations("budget");
  return (
    <div className="space-y-4">
      {canEdit ? <AddCategoryForm /> : null}
      {categories.length ? (
        <ul className="grid gap-2">
          {categories.map(item => (
            <CategoryRow key={item.id} item={item} canEdit={canEdit} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t("categories.empty")}</p>
      )}
      {canEdit && archived.length ? (
        <details className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <summary className="cursor-pointer text-sm text-slate-300">{t("categories.archived", { count: archived.length })}</summary>
          <ul className="mt-3 space-y-2">
            {archived.map(item => (
              <ArchivedRow key={item.id} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
