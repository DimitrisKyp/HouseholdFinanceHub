"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addExpense } from "@/lib/features/financeSlice";
import HeroSection from "@/components/home/HeroSection";
import ExpenseTrackerPanel from "@/components/home/ExpenseTrackerPanel";
import FinancialNewsPanel from "@/components/home/FinancialNewsPanel";
import GoalsRemindersPanel from "@/components/home/GoalsRemindersPanel";
import ExpenseBreakdownDrawer from "@/components/home/ExpenseBreakdownDrawer";

export default function Home() {
  const dispatch = useDispatch();
  const finance = useSelector((state) => state.finance);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const formatCurrency = (value) => `€${numberFormatter.format(value)}`;
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Groceries",
    amount: "",
    paidBy: "Alex",
  });
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const totalIncome = useMemo(
    () => finance.incomeSources.reduce((sum, income) => sum + income.amount, 0),
    [finance.incomeSources]
  );

  const recurringExpensesTotal = useMemo(
    () => finance.recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [finance.recurringExpenses]
  );

  const totals = useMemo(() => {
    const totalExpenses = finance.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const savings = totalIncome - recurringExpensesTotal - totalExpenses;
    const savingsRate = totalIncome
      ? Math.max(0, Math.round((savings / totalIncome) * 100))
      : 0;

    return { totalExpenses, savings, savingsRate };
  }, [finance.expenses, recurringExpensesTotal, totalIncome]);

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

  return (
    <>
      <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        <HeroSection
          monthlyIncome={totalIncome}
          totalExpenses={totals.totalExpenses}
          totals={totals}
          incomeSourcesCount={finance.incomeSources.length}
          recurringExpensesCount={finance.recurringExpenses.length}
          formatCurrency={formatCurrency}
        />

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <ExpenseTrackerPanel
              expenseForm={expenseForm}
              setExpenseForm={setExpenseForm}
              onSubmit={handleExpenseSubmit}
              budgetCategories={finance.budgetCategories}
              members={finance.members}
              onOpenBreakdown={() => setBreakdownOpen(true)}
            />

            <FinancialNewsPanel news={finance.marketNews} />
          </div>

          <div className="space-y-6">
            <GoalsRemindersPanel goals={finance.goals} />

            <section className="rounded-3xl border border-cyan-400/10 bg-cyan-400/10 p-6 text-sm leading-6 text-cyan-50">
              <p className="font-medium text-white">Other views</p>
              <p className="mt-2 text-cyan-50/90">
                Use <strong className="text-white">Budget</strong> to set up income and bills.
                Use <strong className="text-white">Goals</strong> to register and track targets.
                Use <strong className="text-white">Members</strong> to manage access.
              </p>
            </section>
          </div>
        </section>
      </main>
    </div>

    <ExpenseBreakdownDrawer
      isOpen={breakdownOpen}
      onClose={() => setBreakdownOpen(false)}
      categoryTotals={categoryTotals}
      expenses={finance.expenses}
      formatCurrency={formatCurrency}
    />
    </>
  );
}
