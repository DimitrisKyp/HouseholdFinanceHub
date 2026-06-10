function MetricCard({ label, value, accent }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 flex items-center gap-3">
      <div className={`h-8 w-1 rounded-full bg-linear-to-b ${accent} shrink-0`} />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-white leading-tight">{value}</p>
      </div>
    </article>
  );
}

export default function HeroSection({
  monthlyIncome,
  totalExpenses,
  totals,
  incomeSourcesCount,
  recurringExpensesCount,
  formatCurrency,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-2xl font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Household Finance Hub
          </p>
          <p className="mt-1 text-sm text-slate-400">Your finance workspace</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <article className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
            <p className="text-xs text-emerald-200">Monthly income</p>
            <p className="text-xl font-semibold leading-tight">{formatCurrency(monthlyIncome)}</p>
          </article>
          <article className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2">
            <p className="text-xs text-rose-200">Expenses this month</p>
            <p className="text-xl font-semibold leading-tight">{formatCurrency(totalExpenses)}</p>
          </article>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard label="Net savings" value={formatCurrency(totals.savings)} accent="from-cyan-400 to-sky-500" />
        <MetricCard label="Savings rate" value={`${totals.savingsRate}%`} accent="from-emerald-400 to-teal-500" />
        <MetricCard label="Income sources" value={incomeSourcesCount} accent="from-violet-400 to-fuchsia-500" />
        <MetricCard label="Recurring bills" value={recurringExpensesCount} accent="from-amber-400 to-orange-500" />
      </div>
    </section>
  );
}

