"use client";

import Link from "next/link";
import { useActionState, useMemo, useOptimistic } from "react";
import AuthField, { FormError, FormSuccess, SelectField } from "@/components/Auth/AuthField";
import Panel from "@/components/Panel";
import { addExpenseAction } from "@/lib/actions/expenses";
import { formatDay, formatMoney } from "@/lib/format";
import { field, parseAmount } from "@/lib/forms";

const RECENT_SHOWN = 5;

/** This month's latest expenses. A row being saved shows straight away, marked "Saving…". */
function RecentExpenses({ items }) {
  if (!items.length) return <p className="text-sm text-slate-500">Nothing logged this month yet.</p>;
  return (
    <ul aria-label="Recent expenses" className="space-y-1.5">
      {items.map(item => (
        <li
          key={item.id}
          aria-busy={item.pending || undefined}
          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${
            item.pending ? "border-dashed border-cyan-400/40 bg-cyan-400/5" : "border-white/5 bg-white/5"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-white">{item.title}</p>
            <p className="truncate text-xs text-slate-400">{item.pending ? `Saving… · ${item.detail}` : item.detail}</p>
          </div>
          <p className="shrink-0 font-medium text-white">{item.amountLabel}</p>
        </li>
      ))}
    </ul>
  );
}

function AddExpenseForm({ categories, members, currentUserId, today, onSubmitting }) {
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

export default function ExpenseTrackerPanel({
  categories,
  members,
  currentUserId,
  today,
  canEdit,
  onOpenBreakdown,
  recentExpenses = [],
  currency = "EUR",
}) {
  // Optimistic UI: the new expense is listed while the server saves it. When the action finishes,
  // the page's fresh data replaces it (or, after a validation error, it simply disappears).
  const latest = useMemo(() => recentExpenses.slice(0, RECENT_SHOWN), [recentExpenses]);
  const [recent, addPending] = useOptimistic(latest, (list, item) => [item, ...list].slice(0, RECENT_SHOWN));
  const showPending = formData => {
    const title = field(formData, "title");
    const amount = parseAmount(field(formData, "amount"));
    const spentOn = field(formData, "spentOn") || today;
    const category = categories.find(item => item.id === field(formData, "categoryId"));
    const payer = members.find(member => member.userId === field(formData, "paidByUserId"));
    // Only what the server will accept; anything else comes back as a field error instead.
    if (!title || amount === null || !category || spentOn > today) return;
    addPending({
      id: `pending-${Date.now()}`,
      title,
      amountLabel: formatMoney(amount, currency),
      detail: [formatDay(spentOn), category.name, payer?.name].filter(Boolean).join(" · "),
      pending: true,
    });
  };

  let body;
  if (!canEdit) {
    body = <p className="text-sm text-slate-400">You have view-only access. Open the breakdown to see this month&apos;s spending.</p>;
  } else if (!categories.length) {
    body = (
      <p className="text-sm text-slate-400">
        Add a category on the{" "}
        <Link href="/budget" className="text-cyan-300 underline-offset-2 hover:underline">
          Budget page
        </Link>{" "}
        before logging expenses.
      </p>
    );
  } else {
    body = (
      <AddExpenseForm categories={categories} members={members} currentUserId={currentUserId} today={today} onSubmitting={showPending} />
    );
  }

  return (
    <Panel title="Expense tracker" subtitle={canEdit ? "Log household spending as it happens." : "Day-to-day household spending."}>
      {body}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">Recent this month</p>
        <RecentExpenses items={recent} />
      </div>
      <button
        type="button"
        onClick={onOpenBreakdown}
        className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
      >
        View budget breakdown & transactions →
      </button>
    </Panel>
  );
}
