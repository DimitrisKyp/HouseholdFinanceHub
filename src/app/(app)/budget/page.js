import Link from "next/link";
import CategoriesPanel from "@/components/Budget/CategoriesPanel";
import RecurringItemsPanel from "@/components/Budget/RecurringItemsPanel";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import { FREQUENCY_LABELS, listCategories, listRecurringItems, recurringTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";

export const metadata = { title: "Budget · Household Finance Hub" };

export default async function BudgetPage() {
  const { householdId, role, currency } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const money = amount => formatMoney(amount, currency);

  const [allCategories, recurring, members] = await Promise.all([
    listCategories(householdId, { includeArchived: true }),
    listRecurringItems(householdId),
    canEdit ? listMembers(householdId) : [],
  ]);

  // Amounts are formatted here so the browser receives ready-to-show labels.
  const toRow = item => ({
    id: item.id,
    title: item.title,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    detail: [FREQUENCY_LABELS[item.frequency], item.type === "income" ? item.memberName : item.categoryName].filter(Boolean).join(" · "),
    amountLabel: money(item.amount),
    monthlyLabel: item.frequency === "monthly" ? null : money(item.monthlyAmount),
  });
  const income = recurring.filter(item => item.type === "income").map(toRow);
  const bills = recurring.filter(item => item.type === "expense").map(toRow);
  const totals = recurringTotals(recurring);

  const categories = allCategories.filter(item => !item.isArchived);
  const categoryRows = categories.map(item => ({
    ...item,
    limitLabel: item.monthlyLimit === null ? null : money(item.monthlyLimit),
  }));
  const archived = allCategories.filter(item => item.isArchived);
  const left = totals.income - totals.expenses;

  return (
    <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">Income & monthly baseline</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">Your salary, side income and fixed bills.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {canEdit
                  ? "Set up what comes in and goes out every month before tracking daily spending. These totals feed the dashboard."
                  : "What comes in and goes out every month. Only owners and editors can change it."}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
                <p className="text-xs text-cyan-200">Left after fixed bills</p>
                <p className={`text-xl leading-tight font-semibold ${left < 0 ? "text-rose-300" : ""}`}>{money(left)} / month</p>
              </div>
              <Link
                href="/"
                className="inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <Panel
          title="Recurring income and bills"
          subtitle="Amounts that repeat. Weekly and yearly items are converted to a monthly average."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <RecurringItemsPanel
              type="income"
              title="Income sources"
              subtitle="Salary and any other regular income."
              totalLabel={money(totals.income)}
              items={income}
              members={members.map(({ userId, name }) => ({ userId, name }))}
              canEdit={canEdit}
            />
            <RecurringItemsPanel
              type="expense"
              title="Fixed bills"
              subtitle="Rent, utilities, subscriptions: costs you expect every time. Pick the category you'd log the payment under, so logging it too doesn't count it twice."
              totalLabel={money(totals.expenses)}
              items={bills}
              categories={categories.map(({ id, name }) => ({ id, name }))}
              canEdit={canEdit}
            />
          </div>
        </Panel>

        <Panel
          title="Categories and monthly limits"
          subtitle="Used to group expenses. Set a limit to see how close you are on the dashboard."
        >
          <CategoriesPanel categories={categoryRows} archived={archived.map(({ id, name }) => ({ id, name }))} canEdit={canEdit} />
        </Panel>
      </main>
    </div>
  );
}
