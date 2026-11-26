"use client";

import Link from "next/link";
import { useActionState } from "react";
import Modal from "@/components/ui/Modal";
import { InlineMessage } from "@/components/ui/Field";
import type { ExpenseListItem } from "@/hooks/usePendingExpenses";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import type { categorySpending } from "@/lib/calculations";
import { useTranslations } from "@/i18n/client";

/** A category's spending this month with formatted amounts (limitLabel is null without a limit). */
export type CategoryTotalItem = ReturnType<typeof categorySpending>[number] & { spentLabel: string; limitLabel: string | null };

export type ExpenseBreakdownDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  monthLabel: string;
  categoryTotals: CategoryTotalItem[];
  expenses: ExpenseListItem[];
  canEdit: boolean;
};

function barColor(percent: number) {
  if (percent >= 90) return "bg-linear-to-r from-rose-400 to-red-500";
  if (percent >= 70) return "bg-linear-to-r from-amber-400 to-orange-500";
  return "bg-linear-to-r from-cyan-400 to-sky-500";
}

function TransactionRow({ item, canEdit }: { item: ExpenseListItem; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(deleteExpenseAction, {});
  const t = useTranslations("dashboard");

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.title}</p>
          <p className="truncate text-sm text-slate-400">{item.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="font-semibold text-rose-200">−{item.amountLabel}</p>
          {canEdit ? (
            <form
              action={formAction}
              onSubmit={event => {
                if (!window.confirm(t("breakdown.confirmDelete", { title: item.title }))) event.preventDefault();
              }}
            >
              <input type="hidden" name="expenseId" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                aria-label={t("breakdown.deleteLabel", { title: item.title })}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60"
              >
                {pending ? "…" : t("breakdown.delete")}
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <InlineMessage state={state.error ? state : null} />
    </li>
  );
}

export default function ExpenseBreakdownDrawer({
  isOpen,
  onClose,
  monthLabel,
  categoryTotals,
  expenses,
  canEdit,
}: ExpenseBreakdownDrawerProps) {
  const t = useTranslations("dashboard");
  return (
    <Modal open={isOpen} onClose={onClose} title={t("breakdown.title")} description={t("breakdown.description", { month: monthLabel })}>
      <div className="space-y-6">
        <section>
          <h3 className="font-medium text-white">{t("breakdown.categories")}</h3>
          {categoryTotals.length ? (
            <ul className="mt-4 space-y-4">
              {categoryTotals.map(item => (
                <li key={item.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">{item.name}</span>
                    <span className={item.percent !== null && item.percent >= 100 ? "text-rose-300" : "text-slate-400"}>
                      {item.limitLabel ? `${item.spentLabel} / ${item.limitLabel}` : t("breakdown.noLimit", { spent: item.spentLabel })}
                    </span>
                  </div>
                  {item.percent !== null ? (
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${barColor(item.percent)}`}
                        style={{ width: `${Math.min(100, item.percent)}%` }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t("breakdown.noCategories")}</p>
          )}
        </section>

        <hr className="border-white/10" />

        <section>
          <h3 className="font-medium text-white">{t("breakdown.transactions", { count: expenses.length })}</h3>
          {expenses.length ? (
            <ul className="mt-4 space-y-3">
              {expenses.map(item => (
                <TransactionRow key={item.id} item={item} canEdit={canEdit} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t("breakdown.noTransactions")}</p>
          )}
          <Link
            href="/transactions"
            className="mt-4 block rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
          >
            {t("breakdown.searchAll")}
          </Link>
        </section>
      </div>
    </Modal>
  );
}
