"use client";

import { useActionState } from "react";
import { useTranslations } from "@/i18n/client";
import { deleteExpenseAction } from "@/lib/actions/expenses";

/** title: the expense's name for the confirm prompt and the button's label. */
export default function DeleteExpenseButton({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState(deleteExpenseAction, {});
  const t = useTranslations("transactions");

  return (
    <form
      action={formAction}
      onSubmit={event => {
        if (!window.confirm(t("table.confirmDelete", { title }))) event.preventDefault();
      }}
    >
      <input type="hidden" name="expenseId" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("table.deleteItem", { title })}
        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
      >
        {pending ? "…" : t("table.delete")}
      </button>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-rose-300">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
