"use client";

// Spending categories with an optional monthly limit. Shared by expenses, recurring bills and budgets.
import { useActionState } from "react";
import TextField, { FormError, FormSuccess, InlineMessage } from "@/components/ui/Field";
import { addCategoryAction, setCategoryArchivedAction, updateCategoryLimitAction } from "@/lib/actions/budget";
import { buttonClasses } from "@/components/ui/Button";

const smallButton =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-60";

function ArchiveButton({ item, archive, onResult }) {
  return (
    <form action={onResult}>
      <input type="hidden" name="categoryId" value={item.id} />
      <input type="hidden" name="archived" value={String(archive)} />
      <button type="submit" className={`${smallButton} ${archive ? "hover:border-rose-400/50" : "hover:border-cyan-400/50"}`}>
        {archive ? "Archive" : "Restore"}
      </button>
    </form>
  );
}

function CategoryRow({ item, canEdit }) {
  const [limitState, limitAction, limitPending] = useActionState(updateCategoryLimitAction, {});
  const [archiveState, archiveAction] = useActionState(setCategoryArchivedAction, {});

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.name}</p>
          <p className="text-xs text-slate-500">{item.limitLabel ? `Limit ${item.limitLabel} / month` : "No monthly limit"}</p>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <form action={limitAction} className="flex items-center gap-2">
              <input type="hidden" name="categoryId" value={item.id} />
              <label className="sr-only" htmlFor={`limit-${item.id}`}>
                Monthly limit for {item.name}
              </label>
              <input
                id={`limit-${item.id}`}
                name="monthlyLimit"
                inputMode="decimal"
                placeholder="No limit"
                defaultValue={item.monthlyLimit ?? ""}
                className="w-24 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
              <button type="submit" disabled={limitPending} className={`${smallButton} hover:border-cyan-400/50`}>
                {limitPending ? "…" : "Save"}
              </button>
            </form>
            <ArchiveButton item={item} archive onResult={archiveAction} />
          </div>
        ) : null}
      </div>
      <InlineMessage state={limitState.error || limitState.success ? limitState : archiveState} />
    </li>
  );
}

function ArchivedRow({ item }) {
  const [state, action] = useActionState(setCategoryArchivedAction, {});
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-4 py-2">
      <span className="truncate text-sm text-slate-400">{item.name}</span>
      <ArchiveButton item={item} archive={false} onResult={action} />
      <InlineMessage state={state.error ? state : null} />
    </li>
  );
}

function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategoryAction, {});

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-[1fr_10rem_auto] md:items-start" noValidate>
      <div className="space-y-3 md:col-span-3">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <TextField
        id="category-name"
        name="name"
        label="New category"
        placeholder="Pets"
        maxLength={50}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <TextField
        id="category-limit"
        name="monthlyLimit"
        label="Monthly limit"
        inputMode="decimal"
        placeholder="Optional"
        defaultValue={state.values?.monthlyLimit}
        error={state.errors?.monthlyLimit}
      />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md", className: "md:mt-6" })}>
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

export default function CategoriesPanel({ categories, archived, canEdit }) {
  return (
    <div className="space-y-4">
      {canEdit ? <AddCategoryForm /> : null}
      {categories.length ? (
        <ul className="grid gap-2 lg:grid-cols-2">
          {categories.map(item => (
            <CategoryRow key={item.id} item={item} canEdit={canEdit} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No categories yet.</p>
      )}
      {canEdit && archived.length ? (
        <details className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <summary className="cursor-pointer text-sm text-slate-300">Archived categories ({archived.length})</summary>
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
