"use client";

import Link from "next/link";

export default function GoalsCompactPanel({ goals }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Goals</h2>
          <p className="mt-0.5 text-xs text-slate-400">Current progress at a glance</p>
        </div>
        <Link
          href="/goals"
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
        >
          Manage →
        </Link>
      </div>
      <div className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 truncate mr-2">{goal.name}</span>
              <span className="shrink-0 text-slate-400">{goal.progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
