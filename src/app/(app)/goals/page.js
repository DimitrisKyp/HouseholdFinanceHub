"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { addGoal, updateGoalProgress } from "@/store/features/financeSlice";
import Panel from "@/components/Panel";

export default function GoalsPage() {
  const dispatch = useDispatch();
  const goals = useSelector((state) => state.finance.goals);
  const [form, setForm] = useState({ name: "", note: "", progress: "0" });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name) return;

    dispatch(
      addGoal({
        name: form.name,
        note: form.note,
        progress: Number(form.progress),
      })
    );

    setForm({ name: "", note: "", progress: "0" });
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-2 py-2 text-white sm:px-3 sm:py-3 lg:px-5">
      <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
        {/* Page header */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/20 backdrop-blur md:p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Goals & reminders
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-4xl">
                Plan what matters, track progress.
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Register household financial goals, set a starting progress, and track
                them over time. Quick progress updates are available inline.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        {/* Register form */}
        <Panel title="Register a goal" subtitle="Add a new goal with a name, note, and optional starting progress.">
          <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs text-slate-300">Goal name</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="Emergency fund"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-xs text-slate-300">Note</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="Save three months of household expenses."
                value={form.note}
                onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))}
              />
            </label>

            <label>
              <span className="mb-1 block text-xs text-slate-300">
                Starting progress — <span className="text-cyan-300">{form.progress}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-cyan-400"
                value={form.progress}
                onChange={(e) => setForm((c) => ({ ...c, progress: e.target.value }))}
              />
            </label>

            <button
              className="self-end rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 md:col-span-3"
              type="submit"
            >
              Add goal
            </button>
          </form>
        </Panel>

        {/* All goals */}
        <Panel title="All goals" subtitle={`${goals.length} goal${goals.length !== 1 ? "s" : ""} registered`}>
          {goals.length === 0 && (
            <p className="text-sm text-slate-500">No goals yet. Register one above.</p>
          )}
          <div className="max-h-[32vh] space-y-3 overflow-y-auto pr-1">
            {goals.map((goal) => (
              <div key={goal.name} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{goal.name}</p>
                    {goal.note && (
                      <p className="mt-1 text-xs text-slate-400">{goal.note}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                    {goal.progress}%
                  </span>
                </div>

                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="flex-1 accent-emerald-400"
                    defaultValue={goal.progress}
                    onChange={(e) =>
                      dispatch(
                        updateGoalProgress({ name: goal.name, progress: Number(e.target.value) })
                      )
                    }
                  />
                  <span className="w-10 shrink-0 text-right text-sm text-slate-400">
                    {goal.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
}
