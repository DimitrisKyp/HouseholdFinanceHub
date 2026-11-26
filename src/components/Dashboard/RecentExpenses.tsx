// Presentational: this month's latest expenses. A row being saved is marked "Saving…".
import type { ExpenseListItem } from "@/hooks/usePendingExpenses";
import { useTranslations } from "@/i18n/client";

/** This month's latest expenses. A row being saved shows straight away, marked "Saving…". */
export default function RecentExpenses({ items }: { items: ExpenseListItem[] }) {
  const t = useTranslations("dashboard");
  if (!items.length) return <p className="text-sm text-slate-500">{t("recent.empty")}</p>;
  return (
    <ul aria-label={t("recent.label")} className="space-y-1.5">
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
            <p className="truncate text-xs text-slate-400">{item.pending ? t("recent.saving", { detail: item.detail }) : item.detail}</p>
          </div>
          <p className="shrink-0 font-medium text-white">{item.amountLabel}</p>
        </li>
      ))}
    </ul>
  );
}
