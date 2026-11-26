import { getTranslations } from "@/i18n/server";

type MetricCardProps = {
  label: string;
  value: string | number;
  /** Gradient classes for the colour bar. */
  accent: string;
  /** Border and background classes. */
  tone?: string;
  labelTone?: string;
};

function MetricCard({ label, value, accent, tone = "border-white/10 bg-slate-950/50", labelTone = "text-slate-400" }: MetricCardProps) {
  return (
    <article className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 lg:gap-0 lg:px-3 2xl:gap-3 2xl:px-4 ${tone}`}>
      {/* The colour bar makes way for the label in the one-row layout on laptop widths. */}
      <div className={`h-8 w-1 shrink-0 rounded-full bg-linear-to-b lg:hidden 2xl:block ${accent}`} />
      <div className="min-w-0">
        <p className={`truncate text-xs ${labelTone}`} title={label}>
          {label}
        </p>
        <p className="truncate text-lg leading-tight font-semibold text-white">{value}</p>
      </div>
    </article>
  );
}

// All values arrive as ready-to-show labels in the household currency. On wide screens the title
// and the six figures share one row, leaving the dashboard's panels more height.
type HeroSectionProps = {
  monthLabel: string;
  incomeLabel: string;
  spentLabel: string;
  billsLabel: string;
  netLabel: string;
  /** Percentage of income left over this month (0-100). */
  savingsRate: number;
  incomeSourcesCount: number;
};

export default async function HeroSection({
  monthLabel,
  incomeLabel,
  spentLabel,
  billsLabel,
  netLabel,
  savingsRate,
  incomeSourcesCount,
}: HeroSectionProps) {
  const t = await getTranslations("dashboard");
  return (
    <section className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
        <div className="shrink-0">
          <p className="text-2xl font-semibold tracking-[0.35em] text-cyan-300 uppercase xl:text-xl xl:tracking-[0.3em]">Household Hub</p>
          <p className="mt-1 text-sm text-slate-400">{monthLabel}</p>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label={t("hero.monthlyIncome")}
            value={incomeLabel}
            accent="from-emerald-300 to-emerald-500"
            tone="border-emerald-400/20 bg-emerald-400/10"
            labelTone="text-emerald-200"
          />
          <MetricCard
            label={t("hero.spentThisMonth")}
            value={spentLabel}
            accent="from-rose-300 to-rose-500"
            tone="border-rose-400/20 bg-rose-400/10"
            labelTone="text-rose-200"
          />
          <MetricCard label={t("hero.leftThisMonth")} value={netLabel} accent="from-cyan-400 to-sky-500" />
          <MetricCard label={t("hero.savingsRate")} value={`${savingsRate}%`} accent="from-emerald-400 to-teal-500" />
          <MetricCard label={t("hero.fixedBills")} value={billsLabel} accent="from-amber-400 to-orange-500" />
          <MetricCard label={t("hero.incomeSources")} value={incomeSourcesCount} accent="from-violet-400 to-fuchsia-500" />
        </div>
      </div>
    </section>
  );
}
