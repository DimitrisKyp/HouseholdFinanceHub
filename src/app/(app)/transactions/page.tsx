import type { Metadata } from "next";
import Link from "next/link";
import Panel from "@/components/Panel";
import TransactionFilters from "@/components/Transactions/TransactionFilters";
import TransactionsTable from "@/components/Transactions/TransactionsTable";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { listCategories, searchExpenses, TRANSACTIONS_PAGE_SIZE } from "@/lib/finance";
import { formatDay, formatMoney, todayIn } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { datePresets, parseTransactionFilters } from "@/lib/transaction-filters";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("transactions"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const { householdId, role, currency, timezone } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const today = todayIn(timezone);
  const filters = parseTransactionFilters(await searchParams, { today });
  const [locale, t] = await Promise.all([getLocale(), getTranslations("transactions")]);
  const day = (isoDate: string) => formatDay(isoDate, locale);

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
    dayLabel: day(row.spentOn),
    amountLabel: formatMoney(row.amount, currency, locale),
  }));

  let rangeLabel = t("range.all");
  if (filters.from && filters.to) rangeLabel = t("range.between", { from: day(filters.from), to: day(filters.to) });
  else if (filters.from) rangeLabel = t("range.since", { from: day(filters.from) });
  else if (filters.to) rangeLabel = t("range.until", { to: day(filters.to) });

  return (
    <Messages namespaces={["transactions"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("intro")}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2" aria-live="polite">
                  <p className="text-xs text-rose-200">{t("summary", { count: t("count", { count: result.count }), range: rangeLabel })}</p>
                  <p className="text-xl leading-tight font-semibold">{formatMoney(result.total, currency, locale)}</p>
                </div>
                <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                  {t("backToDashboard")}
                </Link>
              </div>
            </div>
          </section>

          <Panel title={t("filtersPanel.title")} subtitle={t("filtersPanel.subtitle")}>
            <TransactionFilters
              filters={filters}
              presets={datePresets(today)}
              categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))}
              members={members.map(({ userId, name }) => ({ userId, name }))}
            />
          </Panel>

          <Panel title={t("resultsPanel.title")} subtitle={t("resultsPanel.subtitle")}>
            <TransactionsTable rows={rows} filters={filters} pageCount={pageCount} canEdit={canEdit} />
          </Panel>
        </main>
      </div>
    </Messages>
  );
}
