"use client";

import { useActionState } from "react";
import { deleteExpenseAction } from "@/lib/actions/expenses";

export default function DeleteExpenseButton({ id, title }) {
  const [state, formAction, pending] = useActionState(deleteExpenseAction, {});

  return (
    <form
      action={formAction}
      onSubmit={event => {
        if (!window.confirm(`Delete ${title}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="expenseId" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Delete ${title}`}
        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
      >
        {pending ? "…" : "Delete"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-rose-300">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
