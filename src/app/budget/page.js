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
    <div className="h-full overflow-y-auto px-3 py-3 text-white sm:px-4 sm:py-4 lg:px-6">
      <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-base font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Income & monthly baseline
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
                Set up your salary, side income, and fixed bills.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
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
