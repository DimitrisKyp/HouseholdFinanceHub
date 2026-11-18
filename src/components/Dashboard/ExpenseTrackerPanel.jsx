"use client";

// Container: the expense form, the recent list (with expenses being saved) and the breakdown button.

import Link from "next/link";
import Panel from "@/components/Panel";
import AddExpenseForm from "@/components/Dashboard/AddExpenseForm";
import RecentExpenses from "@/components/Dashboard/RecentExpenses";
import { usePendingExpenses } from "@/hooks/usePendingExpenses";

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
  // Optimistic UI: a new expense is listed while the server saves it.
  const { items: recent, showPending } = usePendingExpenses({ recentExpenses, categories, members, today, currency });

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
