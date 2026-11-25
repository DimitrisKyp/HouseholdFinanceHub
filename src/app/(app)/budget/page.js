import Link from "next/link";
import AssetsPanel from "@/components/Budget/AssetsPanel";
import RecurringItemsPanel from "@/components/Budget/RecurringItemsPanel";
import Panel from "@/components/Panel";
import { requireHousehold } from "@/lib/dal";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { recurringRow } from "@/lib/budget-view";
import { netWorth } from "@/lib/calculations";
import { listAssets, listRecurringItems, recurringTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { listMembers } from "@/lib/invites";
import { can } from "@/lib/permissions";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("budget"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

// Finances: regular income and what the household owns (net worth). Fixed bills and category
// limits are on the Spending page (/categories).
export default async function BudgetPage() {
  const { householdId, role, currency } = await requireHousehold();
  const canEdit = can(role, "finance:write");
  const [locale, t] = await Promise.all([getLocale(), getTranslations("budget")]);
  const money = amount => formatMoney(amount, currency, locale);

  const [recurring, assets, members] = await Promise.all([
    listRecurringItems(householdId),
    listAssets(householdId),
    canEdit ? listMembers(householdId) : [],
  ]);

  const income = recurring.filter(item => item.type === "income").map(item => recurringRow(item, t, money));
  const totals = recurringTotals(recurring);
  const left = totals.income - totals.expenses;
  const assetRows = assets.map(item => ({ ...item, valueLabel: money(item.value) }));

  return (
    <Messages namespaces={["budget"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("eyebrow")}</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">{t("heading")}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{canEdit ? t("introEdit") : t("introView")}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
                  <p className="text-xs text-cyan-200">{t("leftAfterBills")}</p>
                  <p className={`text-xl leading-tight font-semibold ${left < 0 ? "text-rose-300" : ""}`}>
                    {t("perMonthAmount", { amount: money(left) })}
                  </p>
                </div>
                <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit" })}>
                  {t("backToDashboard")}
                </Link>
              </div>
            </div>
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title={t("recurring.incomeTitle")} subtitle={t("recurring.incomeSubtitle")}>
              <RecurringItemsPanel
                type="income"
                totalLabel={money(totals.income)}
                items={income}
                members={members.map(({ userId, name }) => ({ userId, name }))}
                canEdit={canEdit}
              />
            </Panel>
            <Panel title={t("assets.title")} subtitle={t("assets.subtitle")}>
              <AssetsPanel assets={assetRows} totalLabel={money(netWorth(assets))} canEdit={canEdit} />
            </Panel>
          </div>
        </main>
      </div>
    </Messages>
  );
}
