import Panel from "@/components/Panel";

export default function BudgetSetupPanel({
  incomeForm,
  setIncomeForm,
  recurringExpenseForm,
  setRecurringExpenseForm,
  onIncomeSubmit,
  onRecurringExpenseSubmit,
  incomeSources,
  recurringExpenses,
  formatCurrency,
}) {
  return (
    <Panel
      title="Income setup and monthly baseline"
      subtitle="Define salary, side income, and the standard monthly bills before tracking daily spending."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-white">Income sources</h3>
              <p className="mt-1 text-sm text-slate-400">Add salary and any other recurring income.</p>
            </div>
            <p className="text-sm text-emerald-200">{formatCurrency(incomeSources.reduce((sum, income) => sum + income.amount, 0))}</p>
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onIncomeSubmit}>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Type</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                value={incomeForm.source}
                onChange={(event) =>
                  setIncomeForm((current) => ({ ...current, source: event.target.value }))
                }
              >
                <option value="Salary">Salary</option>
                <option value="Freelance">Freelance</option>
                <option value="Bonus">Bonus</option>
                <option value="Passive income">Passive income</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Description</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="Main salary"
                value={incomeForm.label}
                onChange={(event) =>
                  setIncomeForm((current) => ({ ...current, label: event.target.value }))
                }
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Amount</span>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="4200"
                value={incomeForm.amount}
                onChange={(event) =>
                  setIncomeForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 md:col-span-3"
              type="submit"
            >
              Add income
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {incomeSources.map((income) => (
              <div
                key={income.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{income.label}</p>
                  <p className="text-sm text-slate-400">{income.source}</p>
                </div>
                <p className="font-semibold text-emerald-200">{formatCurrency(income.amount)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-white">Standard monthly expenses</h3>
              <p className="mt-1 text-sm text-slate-400">Capture the fixed costs you expect every month.</p>
            </div>
            <p className="text-sm text-rose-200">{formatCurrency(recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0))}</p>
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onRecurringExpenseSubmit}>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Category</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                value={recurringExpenseForm.category}
                onChange={(event) =>
                  setRecurringExpenseForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="Housing">Housing</option>
                <option value="Utilities">Utilities</option>
                <option value="Transport">Transport</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Insurance">Insurance</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Expense</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="Rent"
                value={recurringExpenseForm.title}
                onChange={(event) =>
                  setRecurringExpenseForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Amount</span>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                placeholder="1450"
                value={recurringExpenseForm.amount}
                onChange={(event) =>
                  setRecurringExpenseForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <button
              className="rounded-xl bg-rose-500 px-4 py-3 font-medium text-white transition hover:bg-rose-400 md:col-span-3"
              type="submit"
            >
              Add monthly expense
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{expense.title}</p>
                  <p className="text-sm text-slate-400">{expense.category}</p>
                </div>
                <p className="font-semibold text-rose-200">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}
