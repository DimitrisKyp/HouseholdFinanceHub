"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import BudgetSetupPanel from "@/components/home/BudgetSetupPanel";
import { addIncomeSource, addRecurringExpense } from "@/lib/features/financeSlice";

export default function BudgetPage() {
  const dispatch = useDispatch();
  const finance = useSelector((state) => state.finance);
  const [incomeForm, setIncomeForm] = useState({
    source: "Salary",
    label: "",
    amount: "",
  });
  const [recurringExpenseForm, setRecurringExpenseForm] = useState({
    category: "Housing",
    title: "",
    amount: "",
  });

  const formatCurrency = (value) =>
    `€${new Intl.NumberFormat("en-US").format(value)}`;

  const handleIncomeSubmit = (event) => {
    event.preventDefault();

    if (!incomeForm.label || !incomeForm.amount) {
      return;
    }

    dispatch(
      addIncomeSource({
        source: incomeForm.source,
        label: incomeForm.label,
        amount: Number(incomeForm.amount),
      })
    );

    setIncomeForm({ source: incomeForm.source, label: "", amount: "" });
  };

  const handleRecurringExpenseSubmit = (event) => {
    event.preventDefault();

    if (!recurringExpenseForm.title || !recurringExpenseForm.amount) {
      return;
    }

    dispatch(
      addRecurringExpense({
        title: recurringExpenseForm.title,
        category: recurringExpenseForm.category,
        amount: Number(recurringExpenseForm.amount),
      })
    );

    setRecurringExpenseForm({
      category: recurringExpenseForm.category,
      title: "",
      amount: "",
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Income & monthly baseline
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Set up your salary, side income, and fixed bills.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Define the financial foundation before tracking daily spending.
                This data feeds the hero summary on the dashboard.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        <BudgetSetupPanel
          incomeForm={incomeForm}
          setIncomeForm={setIncomeForm}
          recurringExpenseForm={recurringExpenseForm}
          setRecurringExpenseForm={setRecurringExpenseForm}
          onIncomeSubmit={handleIncomeSubmit}
          onRecurringExpenseSubmit={handleRecurringExpenseSubmit}
          incomeSources={finance.incomeSources}
          recurringExpenses={finance.recurringExpenses}
          formatCurrency={formatCurrency}
        />
      </main>
    </div>
  );
}
