import { useMemo, useOptimistic } from "react";
import { expenseName, formatDay, formatMoney } from "@/lib/format";
import { field, parseAmount } from "@/lib/forms";

/** A row in the recent expenses list; `pending` while it is still being saved. */
export type ExpenseListItem = { id: string; title: string; amountLabel: string; detail: string; pending?: boolean };

/**
 * Optimistic UI for new expenses: the latest `limit` expenses, plus any being saved right now.
 * Call showPending(formData) at the start of the form's action; when the action finishes, the
 * page's fresh data replaces the pending row (after a validation error it simply disappears).
 * Only input the server will accept is shown, so nothing flashes up only to be rejected.
 * locale: the UI language, for the amount and date.
 */
export function usePendingExpenses({
  recentExpenses,
  categories,
  members,
  today,
  currency,
  locale,
  limit = 5,
}: {
  recentExpenses: ExpenseListItem[];
  categories: { id: string; name: string }[];
  members: { userId: string; name: string }[];
  today: string;
  currency: string;
  locale: string;
  limit?: number;
}) {
  const latest = useMemo(() => recentExpenses.slice(0, limit), [recentExpenses, limit]);
  const [items, addPending] = useOptimistic(latest, (list, item: ExpenseListItem) => [item, ...list].slice(0, limit));

  const showPending = (formData: FormData) => {
    const title = field(formData, "title");
    const amount = parseAmount(field(formData, "amount"));
    const spentOn = field(formData, "spentOn") || today;
    const category = categories.find(item => item.id === field(formData, "categoryId"));
    const payer = members.find(member => member.userId === field(formData, "paidByUserId"));
    if (title.length > 120 || amount === null || !category || spentOn > today) return;
    addPending({
      id: `pending-${Date.now()}`,
      title: expenseName(title, category.name),
      amountLabel: formatMoney(amount, currency, locale),
      // Without a description the category is already the title.
      detail: [formatDay(spentOn, locale), title ? category.name : null, payer?.name].filter(Boolean).join(" · "),
      pending: true,
    });
  };

  return { items, showPending };
}
