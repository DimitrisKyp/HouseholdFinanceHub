"use client";

// Savings forecast on the Goals page: what's likely left over each month, the running total
// a few months out, and whether that covers what the goals need. Plain numbers, not a chart:
// with the same amount every month, a chart would only draw a straight line.
import Link from "next/link";
import { useTranslations } from "@/i18n/client";

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
 *   goals: { neededLabel, verdict } | null } (see forecastView in lib/forecast.js, already in the UI language)
 */
export default function SavingsForecast({ forecast }) {
  const t = useTranslations("goals");

  if (!forecast) {
    return (
      <p className="text-sm text-slate-400">
        {t("forecast.emptyBefore")}{" "}
        <Link href="/budget" className="text-cyan-300 underline-offset-2 hover:underline">
          {t("forecast.emptyLink")}
        </Link>{" "}
        {t("forecast.emptyAfter")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("forecast.leftOver")}
          value={forecast.monthlyLabel}
          detail={forecast.monthlyNegative ? t("forecast.moreOut") : t("forecast.beforeSaving")}
        />
        {forecast.horizons.map(horizon => (
          <Tile
            key={horizon.months}
            label={t("forecast.inMonths", { count: horizon.months })}
            value={horizon.valueLabel}
            detail={horizon.detail}
          />
        ))}
        <Tile
          label={t("forecast.goalsNeed")}
          value={forecast.goals ? t("forecast.perMonth", { amount: forecast.goals.neededLabel }) : "—"}
          detail={forecast.goals ? forecast.goals.verdict : t("forecast.noGoals")}
        />
      </div>
      <p className="text-xs leading-5 text-slate-400">
        {forecast.breakdown} {forecast.basisNote} {t("forecast.assumes")}
      </p>
    </div>
  );
}
