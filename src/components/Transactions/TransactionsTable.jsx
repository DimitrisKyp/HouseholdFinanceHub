"use client";

import Link from "next/link";
import DeleteExpenseButton from "@/components/Transactions/DeleteExpenseButton";
import { useTranslations } from "@/i18n/client";
import { sortHref, transactionsHref } from "@/lib/transaction-filters";

// labelKey: under "table" in the transactions messages.
const COLUMNS = [
  { key: "date", labelKey: "date" },
  { key: "title", labelKey: "description" },
  { key: "category", labelKey: "category" },
  { key: null, labelKey: "paidBy" },
  { key: "amount", labelKey: "amount", align: "right" },
];

function SortHeader({ column, filters }) {
  const t = useTranslations("transactions");
  const label = t(`table.${column.labelKey}`);
  const align = column.align === "right" ? "text-right" : "text-left";
  if (!column.key) {
    return (
      <th scope="col" className={`px-3 py-2 font-medium ${align}`}>
        {label}
      </th>
    );
  }
  const active = filters.sort === column.key;
  const ariaSort = active ? (filters.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort} className={`px-3 py-2 font-medium ${align}`}>
      <Link
        href={sortHref(filters, column.key)}
        className={`inline-flex items-center gap-1 transition hover:text-white ${active ? "text-cyan-200" : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {active ? (filters.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function Pagination({ filters, pageCount }) {
  const t = useTranslations("transactions");
  if (pageCount <= 1) return null;
  const linkClass = "rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:border-cyan-400/40 hover:text-white";
  return (
    <nav aria-label={t("table.pages")} className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
      {filters.page > 1 ? (
        <Link href={transactionsHref(filters, { page: filters.page - 1 })} className={linkClass}>
          {t("table.newer")}
        </Link>
      ) : (
        <span />
      )}
      <span>{t("table.pageOf", { page: filters.page, pageCount })}</span>
      {filters.page < pageCount ? (
        <Link href={transactionsHref(filters, { page: filters.page + 1 })} className={linkClass}>
          {t("table.older")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default function TransactionsTable({ rows, filters, pageCount, canEdit }) {
  const t = useTranslations("transactions");
  if (!rows.length) {
    return <p className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">{t("table.empty")}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-white/5 text-xs text-slate-400">
            <tr>
              {COLUMNS.map(column => (
                <SortHeader key={column.labelKey} column={column} filters={filters} />
              ))}
              {canEdit ? (
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">{t("table.actions")}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-white/5">
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{row.dayLabel}</td>
                <td className="max-w-[18rem] truncate px-3 py-2.5 font-medium text-white">{row.title}</td>
                <td className="px-3 py-2.5 text-slate-300">{row.categoryName}</td>
                <td className="px-3 py-2.5 text-slate-400">{row.paidByName ?? "—"}</td>
                <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap text-rose-200">{row.amountLabel}</td>
                {canEdit ? (
                  <td className="px-3 py-2.5 text-right">
                    <DeleteExpenseButton id={row.id} title={row.title} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination filters={filters} pageCount={pageCount} />
    </>
  );
}
