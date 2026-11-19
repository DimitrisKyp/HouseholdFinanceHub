import { getTranslations } from "@/i18n/server";

function MetricCard({ label, value, accent }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <div className={`h-8 w-1 shrink-0 rounded-full bg-linear-to-b ${accent}`} />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg leading-tight font-semibold text-white">{value}</p>
      </div>
    </article>
  );
}

// All values arrive as ready-to-show labels in the household currency.
export default async function HeroSection({ monthLabel, incomeLabel, spentLabel, billsLabel, netLabel, savingsRate, incomeSourcesCount }) {
  const t = await getTranslations("dashboard");
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-[0.35em] text-cyan-300 uppercase">Household Finance Hub</p>
          <p className="mt-1 text-sm text-slate-400">{monthLabel}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <article className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
            <p className="text-xs text-emerald-200">{t("hero.monthlyIncome")}</p>
            <p className="text-xl leading-tight font-semibold">{incomeLabel}</p>
          </article>
          <article className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2">
            <p className="text-xs text-rose-200">{t("hero.spentThisMonth")}</p>
            <p className="text-xl leading-tight font-semibold">{spentLabel}</p>
          </article>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard label={t("hero.leftThisMonth")} value={netLabel} accent="from-cyan-400 to-sky-500" />
        <MetricCard label={t("hero.savingsRate")} value={`${savingsRate}%`} accent="from-emerald-400 to-teal-500" />
        <MetricCard label={t("hero.fixedBills")} value={billsLabel} accent="from-amber-400 to-orange-500" />
        <MetricCard label={t("hero.incomeSources")} value={incomeSourcesCount} accent="from-violet-400 to-fuchsia-500" />
      </div>
    </section>
  );
}
