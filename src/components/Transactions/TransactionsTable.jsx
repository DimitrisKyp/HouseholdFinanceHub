import Link from "next/link";
import DeleteExpenseButton from "@/components/Transactions/DeleteExpenseButton";
import { sortHref, transactionsHref } from "@/lib/transaction-filters";

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "title", label: "Description" },
  { key: "category", label: "Category" },
  { key: null, label: "Paid by" },
  { key: "amount", label: "Amount", align: "right" },
];

function SortHeader({ column, filters }) {
  const align = column.align === "right" ? "text-right" : "text-left";
  if (!column.key) {
    return (
      <th scope="col" className={`px-3 py-2 font-medium ${align}`}>
        {column.label}
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
        {column.label}
        <span aria-hidden="true" className="text-[10px]">
          {active ? (filters.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function Pagination({ filters, pageCount }) {
  if (pageCount <= 1) return null;
  const linkClass = "rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:border-cyan-400/40 hover:text-white";
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
      {filters.page > 1 ? (
        <Link href={transactionsHref(filters, { page: filters.page - 1 })} className={linkClass}>
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {filters.page} of {pageCount}
      </span>
      {filters.page < pageCount ? (
        <Link href={transactionsHref(filters, { page: filters.page + 1 })} className={linkClass}>
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default function TransactionsTable({ rows, filters, pageCount, canEdit }) {
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
        No transactions match these filters.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-white/5 text-xs text-slate-400">
            <tr>
              {COLUMNS.map(column => (
                <SortHeader key={column.label} column={column} filters={filters} />
              ))}
              {canEdit ? (
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
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
