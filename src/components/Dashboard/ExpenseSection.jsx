"use client";

// Expense form + the slide-over breakdown it opens. Holds the drawer's open/closed state.
// The drawer's code is only downloaded the first time it's opened.
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const ExpenseBreakdownDrawer = dynamic(() => import("@/components/Dashboard/ExpenseBreakdownDrawer"), { ssr: false });
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
  const [opened, setOpened] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <ExpenseTrackerPanel
        categories={categories}
        members={members}
        currentUserId={currentUserId}
        today={today}
        canEdit={canEdit}
        onOpenBreakdown={() => {
          setOpened(true);
          setOpen(true);
        }}
        recentExpenses={expenses}
        currency={currency}
      />
      {opened ? (
        <ExpenseBreakdownDrawer
          isOpen={open}
          onClose={close}
          monthLabel={monthLabel}
          categoryTotals={categoryTotals}
          expenses={expenses}
          canEdit={canEdit}
        />
      ) : null}
    </>
  );
}
