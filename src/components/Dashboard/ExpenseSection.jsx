"use client";

// Expense form + the slide-over breakdown it opens. Holds the drawer's open/closed state.
import { useCallback, useState } from "react";
import ExpenseBreakdownDrawer from "@/components/Dashboard/ExpenseBreakdownDrawer";
import ExpenseTrackerPanel from "@/components/Dashboard/ExpenseTrackerPanel";

export default function ExpenseSection({
  categories,
  members,
  currentUserId,
  today,
  canEdit,
  monthLabel,
  categoryTotals,
  expenses,
  currency,
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <ExpenseTrackerPanel
        categories={categories}
        members={members}
        currentUserId={currentUserId}
        today={today}
        canEdit={canEdit}
        onOpenBreakdown={() => setOpen(true)}
        recentExpenses={expenses}
        currency={currency}
      />
      <ExpenseBreakdownDrawer
        isOpen={open}
        onClose={close}
        monthLabel={monthLabel}
        categoryTotals={categoryTotals}
        expenses={expenses}
        canEdit={canEdit}
      />
    </>
  );
}
