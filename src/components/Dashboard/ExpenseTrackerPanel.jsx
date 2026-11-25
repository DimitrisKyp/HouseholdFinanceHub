"use client";

// Container: the expense form, the recent list (with expenses being saved) and the breakdown button.

import Link from "next/link";
import Panel from "@/components/Panel";
import AddExpenseForm from "@/components/Dashboard/AddExpenseForm";
import RecentExpenses from "@/components/Dashboard/RecentExpenses";
import { usePendingExpenses } from "@/hooks/usePendingExpenses";
import { useLocale, useTranslations } from "@/i18n/client";

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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { items: recent, showPending } = usePendingExpenses({ recentExpenses, categories, members, today, currency, locale });

  let body;
  if (!canEdit) {
    body = <p className="text-sm text-slate-400">{t("tracker.viewOnly")}</p>;
  } else if (!categories.length) {
    body = (
      <p className="text-sm text-slate-400">
        {t("tracker.noCategoriesBefore")}{" "}
        <Link href="/categories" className="text-cyan-300 underline-offset-2 hover:underline">
          {t("tracker.noCategoriesLink")}
        </Link>{" "}
        {t("tracker.noCategoriesAfter")}
      </p>
    );
  } else {
    body = (
      <AddExpenseForm categories={categories} members={members} currentUserId={currentUserId} today={today} onSubmitting={showPending} />
    );
  }

  return (
    // Fills the dashboard's left column on large screens: the form stays put and the recent list
    // scrolls inside the panel.
    <Panel
      title={t("tracker.title")}
      subtitle={canEdit ? t("tracker.subtitleEdit") : t("tracker.subtitleView")}
      className="flex flex-col lg:min-h-0 lg:flex-1"
      contentClassName="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
    >
      <div className="shrink-0">{body}</div>
      <div className="mt-4 flex min-h-24 flex-1 flex-col">
        <p className="mb-2 shrink-0 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">{t("tracker.recentThisMonth")}</p>
        {/* Focusable so keyboard users can scroll it when it overflows. */}
        <div
          role="region"
          aria-label={t("tracker.recentThisMonth")}
          tabIndex={0}
          className="relative min-h-0 flex-1 overflow-y-auto rounded-lg"
        >
          <RecentExpenses items={recent} />
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenBreakdown}
        className="mt-4 w-full shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
      >
        {t("tracker.viewBreakdown")}
      </button>
    </Panel>
  );
}
