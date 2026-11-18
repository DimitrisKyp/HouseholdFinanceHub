// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecurringItemsPanel from "@/components/Budget/RecurringItemsPanel";
import { addRecurringItemAction, updateBillCategoryAction } from "@/lib/actions/budget";

// The real actions talk to the database; the component only needs their (state, formData) contract.
vi.mock("@/lib/actions/budget", () => ({
  addRecurringItemAction: vi.fn(),
  deleteRecurringItemAction: vi.fn(async () => ({ success: "Removed." })),
  updateBillCategoryAction: vi.fn(async () => ({ success: "Now in Bills." })),
}));

const items = [
  { id: "1", title: "Rent", categoryId: "c-housing", detail: "Monthly · Housing", amountLabel: "€850", monthlyLabel: null },
  { id: "2", title: "Car insurance", categoryId: "c-bills", detail: "Yearly · Bills", amountLabel: "€480", monthlyLabel: "€40" },
];
const categories = [
  { id: "c-housing", name: "Housing" },
  { id: "c-bills", name: "Bills" },
];

function renderBills(props = {}) {
  return render(
    <RecurringItemsPanel
      type="expense"
      title="Fixed bills"
      subtitle="Costs you expect every time."
      totalLabel="€890"
      items={items}
      categories={categories}
      canEdit
      {...props}
    />,
  );
}

beforeEach(() => vi.mocked(addRecurringItemAction).mockReset());

describe("RecurringItemsPanel", () => {
  it("lists items with their monthly equivalent and the total", () => {
    renderBills();
    expect(screen.getByText("€890")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("Car insurance")).toBeInTheDocument();
    expect(within(rows[1]).getByText("≈ €40 / month")).toBeInTheDocument();
  });

  it("is read-only for viewers: no form and no remove buttons", () => {
    renderBills({ canEdit: false });
    expect(screen.queryByRole("button", { name: "Add bill" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Category for Rent")).not.toBeInTheDocument();
  });

  it("shows an empty state", () => {
    renderBills({ items: [] });
    expect(screen.getByText("No recurring bills added yet.")).toBeInTheDocument();
  });

  it("submits the form data and shows field errors from the server", async () => {
    vi.mocked(addRecurringItemAction).mockResolvedValue({
      errors: { amount: "Enter an amount above zero, e.g. 1250 or 12.50." },
      values: { title: "Internet", amount: "abc", frequency: "monthly", categoryId: "c-bills" },
    });
    const user = userEvent.setup();
    renderBills();

    await user.type(screen.getByLabelText("Bill"), "Internet");
    await user.type(screen.getByLabelText("Amount"), "abc");
    await user.selectOptions(screen.getByLabelText("Category"), "Bills");
    await user.click(screen.getByRole("button", { name: "Add bill" }));

    expect(await screen.findByText("Enter an amount above zero, e.g. 1250 or 12.50.")).toBeInTheDocument();
    const formData = vi.mocked(addRecurringItemAction).mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({
      type: "expense",
      title: "Internet",
      amount: "abc",
      frequency: "monthly",
      categoryId: "c-bills",
    });
    // What was typed is kept after an error, and the field is flagged for screen readers.
    expect(screen.getByLabelText("Bill")).toHaveValue("Internet");
    expect(screen.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the success message and keeps the chosen category for the next entry", async () => {
    vi.mocked(addRecurringItemAction).mockResolvedValue({
      success: "Internet added.",
      values: { frequency: "monthly", categoryId: "c-bills" },
    });
    const user = userEvent.setup();
    renderBills();

    await user.type(screen.getByLabelText("Bill"), "Internet");
    await user.type(screen.getByLabelText("Amount"), "30");
    await user.selectOptions(screen.getByLabelText("Category"), "Bills");
    await user.click(screen.getByRole("button", { name: "Add bill" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Internet added.");
    expect(screen.getByLabelText("Bill")).toHaveValue("");
    expect(screen.getByLabelText("Category")).toHaveValue("c-bills");
  });

  it("moves a bill to another category", async () => {
    const user = userEvent.setup();
    renderBills();

    expect(screen.getByLabelText("Category for Rent")).toHaveValue("c-housing");
    await user.selectOptions(screen.getByLabelText("Category for Rent"), "Bills");
    await user.click(screen.getByRole("button", { name: "Save category for Rent" }));

    expect(await screen.findByText("Now in Bills.")).toBeInTheDocument();
    const formData = vi.mocked(updateBillCategoryAction).mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({ itemId: "1", categoryId: "c-bills" });
  });
});
