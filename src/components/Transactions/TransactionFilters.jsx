// Filter bar for the transactions page. A GET form (next/form adds client-side navigation),
// so the filters end up in the URL and a filtered view can be bookmarked or shared.
import Form from "next/form";
import Link from "next/link";
import { transactionsHref } from "@/lib/transaction-filters";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400";

export default function TransactionFilters({ filters, presets, categories, members }) {
  const activePreset = presets.find(item => item.from === (filters.from ?? "") && item.to === (filters.to ?? ""));

  return (
    <div className="space-y-3">
      <nav aria-label="Date range" className="flex flex-wrap gap-2">
        {presets.map(item => {
          const active = activePreset?.key === item.key;
          return (
            <Link
              key={item.key}
              href={transactionsHref(filters, { from: item.from, to: item.to, page: 1 })}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-200"
                  : "border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* key: re-mount when the URL changes so the inputs show the current filters. */}
      <Form
        key={transactionsHref(filters)}
        action="/transactions"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="filter-q" className="mb-1 block text-xs text-slate-300">
            Search
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            placeholder="e.g. groceries"
            maxLength={100}
            defaultValue={filters.q}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="filter-from" className="mb-1 block text-xs text-slate-300">
            From
          </label>
          <input id="filter-from" name="from" type="date" defaultValue={filters.from ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="filter-to" className="mb-1 block text-xs text-slate-300">
            To
          </label>
          <input id="filter-to" name="to" type="date" defaultValue={filters.to ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="filter-category" className="mb-1 block text-xs text-slate-300">
            Category
          </label>
          <select id="filter-category" name="category" defaultValue={filters.categoryId} className={inputClass}>
            <option value="">All categories</option>
            {categories.map(item => (
              <option key={item.id} value={item.id}>
                {item.isArchived ? `${item.name} (archived)` : item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-member" className="mb-1 block text-xs text-slate-300">
            Paid by
          </label>
          <select id="filter-member" name="member" defaultValue={filters.paidByUserId} className={inputClass}>
            <option value="">Anyone</option>
            {members.map(member => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        {/* Keep the current sort when filtering; the page resets to 1. */}
        {filters.sort !== "date" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
        <input type="hidden" name="dir" value={filters.dir} />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Apply
          </button>
          <Link
            href="/transactions"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white"
          >
            Reset
          </Link>
        </div>
      </Form>
    </div>
  );
}
