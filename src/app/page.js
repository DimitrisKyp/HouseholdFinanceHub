"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addExpense, inviteMember } from "@/lib/features/financeSlice";

export default function Home() {
  const dispatch = useDispatch();
  const finance = useSelector((state) => state.finance);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Groceries",
    amount: "",
    paidBy: "Alex",
  });
  const [inviteEmail, setInviteEmail] = useState("");

  const totals = useMemo(() => {
    const totalExpenses = finance.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const savings = finance.monthlyIncome - totalExpenses;
    const savingsRate = finance.monthlyIncome
      ? Math.max(0, Math.round((savings / finance.monthlyIncome) * 100))
      : 0;

    return { totalExpenses, savings, savingsRate };
  }, [finance.expenses, finance.monthlyIncome]);

  const categoryTotals = useMemo(() => {
    return finance.budgetCategories.map((category) => {
      const spent = finance.expenses
        .filter((expense) => expense.category === category.name)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        ...category,
        spent,
        percent: Math.min(100, Math.round((spent / category.limit) * 100)),
      };
    });
  }, [finance.budgetCategories, finance.expenses]);

  const handleExpenseSubmit = (event) => {
    event.preventDefault();

    if (!expenseForm.title || !expenseForm.amount) {
      return;
    }

    dispatch(
      addExpense({
        title: expenseForm.title,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        paidBy: expenseForm.paidBy,
      })
    );

    setExpenseForm({
      title: "",
      category: expenseForm.category,
      amount: "",
      paidBy: expenseForm.paidBy,
    });
  };

  const handleInviteSubmit = (event) => {
    event.preventDefault();

    if (!inviteEmail) {
      return;
    }

    dispatch(inviteMember(inviteEmail));
    setInviteEmail("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Household Finance Hub
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Track money, manage family budgets, and stay on top of market news.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                A frontend-first finance dashboard for personal budgets, household
                members, expense tracking, and live-style market insights.
              </p>
            </div>
            <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm text-emerald-200">Monthly income</p>
                <p className="mt-2 text-3xl font-semibold">
                  €{finance.monthlyIncome.toLocaleString()}
                </p>
              </article>
              <article className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                <p className="text-sm text-rose-200">Expenses this month</p>
                <p className="mt-2 text-3xl font-semibold">
                  €{totals.totalExpenses.toLocaleString()}
                </p>
              </article>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="Net savings" value={`€${totals.savings.toLocaleString()}`} accent="from-cyan-400 to-sky-500" />
            <MetricCard label="Savings rate" value={`${totals.savingsRate}%`} accent="from-emerald-400 to-teal-500" />
            <MetricCard label="Active members" value={finance.members.length} accent="from-violet-400 to-fuchsia-500" />
            <MetricCard label="Open invites" value={finance.invites.length} accent="from-amber-400 to-orange-500" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <Panel title="Expense tracker" subtitle="Add household spending and see category pressure instantly.">
              <form className="grid gap-4 md:grid-cols-4" onSubmit={handleExpenseSubmit}>
                <label className="md:col-span-2">
                  <span className="mb-1 block text-sm text-slate-300">Expense</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                    placeholder="School supplies"
                    value={expenseForm.title}
                    onChange={(event) =>
                      setExpenseForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-slate-300">Category</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    value={expenseForm.category}
                    onChange={(event) =>
                      setExpenseForm((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    {finance.budgetCategories.map((category) => (
                      <option key={category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-sm text-slate-300">Amount</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                    placeholder="45"
                    value={expenseForm.amount}
                    onChange={(event) =>
                      setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-slate-300">Paid by</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    value={expenseForm.paidBy}
                    onChange={(event) =>
                      setExpenseForm((current) => ({ ...current, paidBy: event.target.value }))
                    }
                  >
                    {finance.members.map((member) => (
                      <option key={member.name} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 md:col-span-4"
                  type="submit"
                >
                  Add expense
                </button>
              </form>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <h3 className="font-medium text-white">Budget categories</h3>
                  <div className="mt-4 space-y-4">
                    {categoryTotals.map((category) => (
                      <div key={category.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{category.name}</span>
                          <span className="text-slate-400">
                            €{category.spent} / €{category.limit}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500"
                            style={{ width: `${category.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <h3 className="font-medium text-white">Recent transactions</h3>
                  <div className="mt-4 space-y-3">
                    {finance.expenses.slice(0, 4).map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{expense.title}</p>
                          <p className="text-sm text-slate-400">
                            {expense.category} · {expense.paidBy}
                          </p>
                        </div>
                        <p className="font-semibold text-rose-200">-€{expense.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Financial news" subtitle="Story-style market updates for a real dashboard feel.">
              <div className="grid gap-4 md:grid-cols-3">
                {finance.marketNews.map((news) => (
                  <article key={news.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{news.source}</p>
                    <h3 className="mt-3 font-semibold text-white">{news.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{news.summary}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Household members" subtitle="Invite people to view or edit the family budget.">
              <form className="flex gap-3" onSubmit={handleInviteSubmit}>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="email@family.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <button
                  className="rounded-xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
                  type="submit"
                >
                  Invite
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {finance.members.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-slate-400">{member.email}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">
                Family members can be granted edit or view-only access later when the
                backend and authentication layer are added.
              </div>
            </Panel>

            <Panel title="Goals & reminders" subtitle="A lightweight household planning board.">
              <div className="space-y-3">
                {finance.goals.map((goal) => (
                  <div key={goal.name} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{goal.name}</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{goal.note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-4 text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}
