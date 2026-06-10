"use client";

export default function ExpenseBreakdownDrawer({
  isOpen,
  onClose,
  categoryTotals,
  expenses,
  formatCurrency,
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-900 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="font-semibold text-white">Budget breakdown</p>
            <p className="mt-0.5 text-xs text-slate-400">Categories and recent transactions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/30 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Budget categories */}
          <section>
            <h3 className="font-medium text-white">Budget categories</h3>
            <div className="mt-4 space-y-4">
              {categoryTotals.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{category.name}</span>
                    <span className="text-slate-400">
                      {formatCurrency(category.spent)} / {formatCurrency(category.limit)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        category.percent >= 90
                          ? "bg-linear-to-r from-rose-400 to-red-500"
                          : category.percent >= 70
                          ? "bg-linear-to-r from-amber-400 to-orange-500"
                          : "bg-linear-to-r from-cyan-400 to-sky-500"
                      }`}
                      style={{ width: `${category.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Recent transactions */}
          <section>
            <h3 className="font-medium text-white">Recent transactions</h3>
            <div className="mt-4 space-y-3">
              {expenses.length === 0 && (
                <p className="text-sm text-slate-500">No transactions yet.</p>
              )}
              {expenses.map((expense) => (
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
                  <p className="font-semibold text-rose-200">-{formatCurrency(expense.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
