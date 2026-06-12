import Panel from "@/components/Panel";

export default function ExpenseTrackerPanel({
  expenseForm,
  setExpenseForm,
  onSubmit,
  budgetCategories,
  members,
  onOpenBreakdown,
}) {
  return (
    <Panel
      title="Expense tracker"
      subtitle="Add household spending. Open the breakdown to review categories and transactions."
    >
      <form className="grid gap-4 md:grid-cols-4" onSubmit={onSubmit}>
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
            {budgetCategories.map((category) => (
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
            {members.map((member) => (
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

      <button
        type="button"
        onClick={onOpenBreakdown}
        className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
      >
        View budget breakdown & transactions →
      </button>
    </Panel>
  );
}
