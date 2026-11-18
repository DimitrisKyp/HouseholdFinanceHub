import Link from "next/link";
import Panel from "@/components/Panel";
import TransactionFilters from "@/components/Transactions/TransactionFilters";
import TransactionsTable from "@/components/Transactions/TransactionsTable";
import { requireHousehold } from "@/lib/dal";
import { listCategories, searchExpenses, TRANSACTIONS_PAGE_SIZE } from "@/lib/finance";
import { formatDay, formatMoney, todayIn } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { datePresets, parseTransactionFilters } from "@/lib/transaction-filters";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Transactions · Household Finance Hub" };

export default async function TransactionsPage({ searchParams }) {
  const { householdId, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const today = todayIn(timezone);
  const filters = parseTransactionFilters(await searchParams, { today });

  const [result, categories, members] = await Promise.all([
    searchExpenses(householdId, filters),
    listCategories(householdId, { includeArchived: true }),
    listMembers(householdId),
  ]);
  const pageCount = Math.max(1, Math.ceil(result.count / TRANSACTIONS_PAGE_SIZE));

  const rows = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    categoryName: row.categoryName,
    paidByName: row.paidByName,
    dayLabel: formatDay(row.spentOn),
    amountLabel: formatMoney(row.amount, currency),
  }));

  let rangeLabel = "All time";
  if (filters.from && filters.to) rangeLabel = `${formatDay(filters.from)} – ${formatDay(filters.to)}`;
  else if (filters.from) rangeLabel = `Since ${formatDay(filters.from)}`;
  else if (filters.to) rangeLabel = `Until ${formatDay(filters.to)}`;

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">Transactions</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">Every expense, searchable.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Filter by date, category or who paid. The filters are part of the address, so you can bookmark or share a view.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2" aria-live="polite">
                <p className="text-xs text-rose-200">
                  {result.count} transaction{result.count === 1 ? "" : "s"} · {rangeLabel}
                </p>
                <p className="text-xl leading-tight font-semibold">{formatMoney(result.total, currency)}</p>
              </div>
              <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <Panel title="Filters" subtitle="Pick a range, or narrow it down further.">
          <TransactionFilters
            filters={filters}
            presets={datePresets(today)}
            categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))}
            members={members.map(({ userId, name }) => ({ userId, name }))}
          />
        </Panel>

        <Panel title="Results" subtitle="Click a column heading to sort.">
          <TransactionsTable rows={rows} filters={filters} pageCount={pageCount} canEdit={canEdit} />
        </Panel>
      </main>
    </div>
  );
}
