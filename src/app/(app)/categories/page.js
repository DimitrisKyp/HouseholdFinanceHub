import Link from "next/link";
import CategoriesPanel from "@/components/Budget/CategoriesPanel";
import RecurringItemsPanel from "@/components/Budget/RecurringItemsPanel";
import Panel from "@/components/Panel";
import { buttonClasses } from "@/components/ui/Button";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { recurringRow } from "@/lib/budget-view";
import { listCategories, listRecurringItems, recurringTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("budget"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("categoriesPage.metaTitle") }) };
}

// Spending: expense categories with their monthly limits (the budget breakdown on the dashboard)
// and the fixed bills that repeat.
export default async function CategoriesPage() {
  const { householdId, role, currency } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const [locale, t] = await Promise.all([getLocale(), getTranslations("budget")]);

  const money = amount => formatMoney(amount, currency, locale);
  const [allCategories, recurring] = await Promise.all([
    listCategories(householdId, { includeArchived: true }),
    listRecurringItems(householdId),
  ]);
  const bills = recurring.filter(item => item.type === "expense").map(item => recurringRow(item, t, money));
  const billsTotal = recurringTotals(recurring).expenses;
  const activeCategories = allCategories.filter(item => !item.isArchived);
  const categoryRows = activeCategories.map(item => ({
    ...item,
    limitLabel: item.monthlyLimit === null ? null : money(item.monthlyLimit),
  }));
  const archived = allCategories.filter(item => item.isArchived).map(({ id, name }) => ({ id, name }));

  return (
    <Messages namespaces={["budget"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("categoriesPage.eyebrow")}</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">{t("categoriesPage.heading")}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {canEdit ? t("categoriesPage.introEdit") : t("categoriesPage.introView")}
                </p>
              </div>
              <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                {t("backToDashboard")}
              </Link>
            </div>
          </section>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <Panel title={t("categories.title")} subtitle={t("categories.subtitle")}>
              <CategoriesPanel categories={categoryRows} archived={archived} canEdit={canEdit} />
            </Panel>
            <Panel title={t("recurring.billsTitle")} subtitle={t("recurring.billsSubtitle")}>
              <RecurringItemsPanel
                type="expense"
                totalLabel={money(billsTotal)}
                items={bills}
                categories={activeCategories.map(({ id, name }) => ({ id, name }))}
                canEdit={canEdit}
              />
            </Panel>
          </div>
        </main>
      </div>
    </Messages>
  );
}
