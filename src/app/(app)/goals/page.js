import Link from "next/link";
import AddGoalForm from "@/components/Goals/AddGoalForm";
import GoalCard from "@/components/Goals/GoalCard";
import SavingsForecast from "@/components/Goals/SavingsForecast";
import Panel from "@/components/Panel";
import Messages from "@/i18n/MessagesProvider";
import { getLocale, getTranslations } from "@/i18n/server";
import { requireHousehold } from "@/lib/dal";
import { goalView } from "@/lib/finance";
import { loadSavingsForecast } from "@/lib/forecast-data";
import { formatMoney, todayIn } from "@/lib/format";
import { can } from "@/lib/permissions";
import { buttonClasses } from "@/components/ui/Button";

export async function generateMetadata() {
  const [t, common] = await Promise.all([getTranslations("goals"), getTranslations("common")]);
  return { title: common("pageTitle", { page: t("metaTitle") }) };
}

export default async function GoalsPage() {
  const { householdId, role, currency, timezone } = await requireHousehold();
  const [locale, t] = await Promise.all([getLocale(), getTranslations("goals")]);
  const canEdit = can(role, "finance:write");
  const today = todayIn(timezone);

  const { forecast, goals, paces } = await loadSavingsForecast(householdId, { today, timezone, currency, locale });
  const views = goals.map(item => goalView(item, { currency, today, pace: paces.get(item.id), locale }));
  const open = views.filter(item => item.status !== "completed");
  const completed = views.filter(item => item.status === "completed");
  const totalSaved = goals.filter(item => item.status !== "completed").reduce((sum, item) => sum + item.saved, 0);

  // Earliest target date allowed in the form: tomorrow (compared as YYYY-MM-DD strings on the server too).
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);

  return (
    <Messages namespaces={["goals"]}>
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
        <main className="mx-auto flex w-full flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[0.35em] text-cyan-300 uppercase">{t("page.eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t("page.heading")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {canEdit ? t("page.introEditor") : t("page.introViewer")}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
                  <p className="text-xs text-emerald-200">{t("page.savedTowardsOpen")}</p>
                  <p className="text-xl leading-tight font-semibold">{formatMoney(totalSaved, currency, locale)}</p>
                </div>
                <Link href="/" className={buttonClasses({ variant: "secondary", size: "pill", className: "w-fit shrink-0" })}>
                  {t("page.backToDashboard")}
                </Link>
              </div>
            </div>
          </section>

          <Panel title={t("page.forecastTitle")} subtitle={t("page.forecastSubtitle")}>
            <SavingsForecast forecast={forecast} />
          </Panel>

          {canEdit ? (
            <Panel title={t("page.newGoalTitle")} subtitle={t("page.newGoalSubtitle")}>
              <AddGoalForm minDate={tomorrow} />
            </Panel>
          ) : null}

          <Panel title={t("page.listTitle")} subtitle={open.length ? t("page.openCount", { count: open.length }) : t("page.noOpen")}>
            {open.length ? (
              <div className="space-y-3">
                {open.map(item => (
                  <GoalCard key={item.id} goal={item} canEdit={canEdit} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{canEdit ? t("page.addFirst") : t("page.nothingYet")}</p>
            )}
          </Panel>

          {completed.length ? (
            <Panel title={t("page.completedTitle", { count: completed.length })} subtitle={t("page.completedSubtitle")}>
              <div className="space-y-3">
                {completed.map(item => (
                  <GoalCard key={item.id} goal={item} canEdit={canEdit} />
                ))}
              </div>
            </Panel>
          ) : null}
        </main>
      </div>
    </Messages>
  );
}
