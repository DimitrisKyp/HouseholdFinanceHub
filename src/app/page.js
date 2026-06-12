"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addExpense } from "@/store/features/financeSlice";
import TopBar from "@/components/TopBar";
import HeroSection from "@/components/Dashboard/HeroSection";
import ExpenseTrackerPanel from "@/components/Dashboard/ExpenseTrackerPanel";
import FinancialNewsPanel from "@/components/Dashboard/FinancialNewsPanel";
import GoalsRemindersPanel from "@/components/Dashboard/GoalsRemindersPanel";
import ExpenseBreakdownDrawer from "@/components/Dashboard/ExpenseBreakdownDrawer";

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
      <div className="h-full overflow-y-auto px-3 py-3 text-white md:px-6">
      <main className="mx-auto flex h-full w-full flex-col gap-4">
        <TopBar
          availableBalance={totals.savings}
          currentUser={finance.currentUser}
          formatCurrency={formatCurrency}
        />
        <HeroSection
          monthlyIncome={totalIncome}
          totalExpenses={totals.totalExpenses}
          totals={totals}
          incomeSourcesCount={finance.incomeSources.length}
          recurringExpensesCount={finance.recurringExpenses.length}
          formatCurrency={formatCurrency}
        />

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="min-h-0 space-y-4">
            <ExpenseTrackerPanel
              expenseForm={expenseForm}
              setExpenseForm={setExpenseForm}
              onSubmit={handleExpenseSubmit}
              budgetCategories={finance.budgetCategories}
              members={finance.members}
              onOpenBreakdown={() => setBreakdownOpen(true)}
            />
          </div>

          <div className="min-h-0 space-y-4">
            <GoalsRemindersPanel goals={finance.goals} />

            <FinancialNewsPanel news={finance.marketNews} />
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
