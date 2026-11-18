import { useMemo, useOptimistic } from "react";
import { formatDay, formatMoney } from "@/lib/format";
import { field, parseAmount } from "@/lib/forms";

/**
 * Optimistic UI for new expenses: the latest `limit` expenses, plus any being saved right now.
 * Call showPending(formData) at the start of the form's action; when the action finishes, the
 * page's fresh data replaces the pending row (after a validation error it simply disappears).
 * Only input the server will accept is shown, so nothing flashes up only to be rejected.
 */
export function usePendingExpenses({ recentExpenses, categories, members, today, currency, limit = 5 }) {
  const latest = useMemo(() => recentExpenses.slice(0, limit), [recentExpenses, limit]);
  const [items, addPending] = useOptimistic(latest, (list, item) => [item, ...list].slice(0, limit));

  const showPending = formData => {
    const title = field(formData, "title");
    const amount = parseAmount(field(formData, "amount"));
    const spentOn = field(formData, "spentOn") || today;
    const category = categories.find(item => item.id === field(formData, "categoryId"));
    const payer = members.find(member => member.userId === field(formData, "paidByUserId"));
    if (!title || amount === null || !category || spentOn > today) return;
    addPending({
      id: `pending-${Date.now()}`,
      title,
      amountLabel: formatMoney(amount, currency),
      detail: [formatDay(spentOn), category.name, payer?.name].filter(Boolean).join(" · "),
      pending: true,
    });
  };

  return { items, showPending };
}
