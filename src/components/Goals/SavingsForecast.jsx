// Savings forecast on the Goals page: what's likely left over each month, the running total
// a few months out, and whether that covers what the goals need. Plain numbers, not a chart:
// with the same amount every month, a chart would only draw a straight line.
import Link from "next/link";

function Tile({ label, value, detail }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl leading-tight font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </article>
  );
}

/**
 * forecast: null, or { monthlyLabel, monthlyNegative, horizons: [{ months, valueLabel, detail }], breakdown, basisNote,
 *   goals: { neededLabel, verdict } | null }
 */
export default function SavingsForecast({ forecast }) {
  if (!forecast) {
    return (
      <p className="text-sm text-slate-400">
        Add your income and bills on the{" "}
        <Link href="/budget" className="text-cyan-300 underline-offset-2 hover:underline">
          Budget page
        </Link>{" "}
        and log a month of expenses (or set category limits) to see a forecast.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Left over each month"
          value={forecast.monthlyLabel}
          detail={forecast.monthlyNegative ? "More goes out than comes in" : "Expected, before saving"}
        />
        {forecast.horizons.map(horizon => (
          <Tile key={horizon.months} label={`In ${horizon.months} months`} value={horizon.valueLabel} detail={horizon.detail} />
        ))}
        <Tile
          label="Your goals need"
          value={forecast.goals ? `${forecast.goals.neededLabel} / month` : "—"}
          detail={forecast.goals ? forecast.goals.verdict : "No active goals with a target date"}
        />
      </div>
      <p className="text-xs leading-5 text-slate-400">
        {forecast.breakdown} {forecast.basisNote} It assumes the coming months look like the recent ones.
      </p>
    </div>
  );
}
