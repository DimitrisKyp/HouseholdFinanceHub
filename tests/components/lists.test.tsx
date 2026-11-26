// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpenseTrackerPanel from "@/components/Dashboard/ExpenseTrackerPanel";
import CategoryBars from "@/components/Insights/CategoryBars";
import TransactionsTable from "@/components/Transactions/TransactionsTable";
import type { TransactionFilters } from "@/lib/transaction-filters";

vi.mock("@/lib/actions/expenses", () => ({ addExpenseAction: vi.fn(), deleteExpenseAction: vi.fn() }));

describe("CategoryBars", () => {
  it("lists categories in the given (ranked) order with amount and share", () => {
    render(
      <CategoryBars
        rows={[
          { id: "g", name: "Groceries", total: 680, totalLabel: "€680", share: 70 },
          { id: "t", name: "Transport", total: 290, totalLabel: "€290", share: 30 },
        ]}
      />,
    );
    const rows = within(screen.getByRole("list", { name: /largest first/ })).getAllByRole("listitem");
    expect(rows.map(row => row.textContent)).toEqual(["Groceries€680 · 70%", "Transport€290 · 30%"]);
  });

  it("shows an empty state", () => {
    render(<CategoryBars rows={[]} />);
    expect(screen.getByText("No spending in this period.")).toBeInTheDocument();
  });
});

describe("TransactionsTable", () => {
  const filters: TransactionFilters = {
    from: "2026-11-01",
    to: "2026-11-30",
    categoryId: "",
    paidByUserId: "",
    q: "",
    sort: "amount",
    dir: "desc",
    page: 2,
  };
  const rows = [
    { id: "e1", title: "Supermarket", categoryName: "Groceries", paidByName: null, dayLabel: "2 Nov 2026", amountLabel: "€120.40" },
  ];

  it("marks the sorted column and links to the other pages", () => {
    render(<TransactionsTable rows={rows} filters={filters} pageCount={3} canEdit={false} />);
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Date/ })).toHaveAttribute("aria-sort", "none");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Newer" })).toHaveAttribute(
      "href",
      "/transactions?from=2026-11-01&to=2026-11-30&sort=amount",
    );
    expect(screen.getByRole("link", { name: "Older →" })).toHaveAttribute("href", expect.stringContaining("page=3"));
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument(); // no payer
  });

  it("shows delete buttons only to editors", () => {
    const { rerender } = render(<TransactionsTable rows={rows} filters={filters} pageCount={1} canEdit={false} />);
    expect(screen.queryByRole("button", { name: "Delete Supermarket" })).not.toBeInTheDocument();
    rerender(<TransactionsTable rows={rows} filters={filters} pageCount={1} canEdit />);
    expect(screen.getByRole("button", { name: "Delete Supermarket" })).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<TransactionsTable rows={[]} filters={filters} pageCount={1} canEdit />);
    expect(screen.getByText("No transactions match these filters.")).toBeInTheDocument();
  });
});

describe("ExpenseTrackerPanel", () => {
  const props = { members: [{ userId: "u1", name: "Alex" }], currentUserId: "u1", today: "2026-11-18", onOpenBreakdown: () => {} };

  it("asks for a category first when there are none", () => {
    render(<ExpenseTrackerPanel {...props} categories={[]} canEdit />);
    expect(screen.getByRole("link", { name: "Spending page" })).toHaveAttribute("href", "/categories");
    expect(screen.queryByRole("button", { name: "Add expense" })).not.toBeInTheDocument();
  });

  it("defaults 'Paid by' to the current user and the date to today", () => {
    render(<ExpenseTrackerPanel {...props} categories={[{ id: "c1", name: "Groceries" }]} canEdit />);
    expect(screen.getByLabelText("Paid by")).toHaveValue("u1");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-18");
    expect(screen.getByLabelText("Date")).toHaveAttribute("max", "2026-11-18");
  });

  it("explains view-only access to viewers", () => {
    render(<ExpenseTrackerPanel {...props} categories={[{ id: "c1", name: "Groceries" }]} canEdit={false} />);
    expect(screen.getByText(/view-only access/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
