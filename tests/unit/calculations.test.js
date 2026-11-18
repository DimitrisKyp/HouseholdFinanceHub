import { describe, expect, it } from "vitest";
import {
  billsByCategory,
  categorySpending,
  goalView,
  monthlyAmount,
  monthsUntil,
  recurringTotals,
  spendingBeyondBills,
} from "@/lib/calculations";
import { can } from "@/lib/permissions";

describe("recurring items", () => {
  it("converts weekly and yearly amounts to a monthly average", () => {
    expect(monthlyAmount({ amount: 1000, frequency: "monthly" })).toBe(1000);
    expect(monthlyAmount({ amount: 60.5, frequency: "weekly" })).toBe(262.17); // 60.5 × 52 / 12
    expect(monthlyAmount({ amount: 480, frequency: "yearly" })).toBe(40);
  });

  it("totals income and expenses separately, in cents", () => {
    const items = [
      { type: "income", monthlyAmount: 2400 },
      { type: "income", monthlyAmount: 262.17 },
      { type: "expense", monthlyAmount: 0.1 },
      { type: "expense", monthlyAmount: 0.2 },
    ];
    expect(recurringTotals(items)).toEqual({ income: 2662.17, expenses: 0.3 });
  });
});

describe("spending beyond fixed bills", () => {
  const recurring = [
    { type: "expense", categoryId: "housing", monthlyAmount: 1000 }, // rent
    { type: "expense", categoryId: "bills", monthlyAmount: 60 }, // internet
    { type: "expense", categoryId: "bills", monthlyAmount: 25.5 }, // phone
    { type: "expense", categoryId: null, monthlyAmount: 40 }, // no category: can't be matched
    { type: "income", categoryId: null, monthlyAmount: 3000 },
  ];
  const bills = billsByCategory(recurring);

  it("adds up fixed bills per category", () => {
    expect(bills).toEqual(
      new Map([
        ["housing", 1000],
        ["bills", 85.5],
      ]),
    );
  });

  it("only counts spending above a category's fixed bills, so a logged bill isn't counted twice", () => {
    const rows = [
      { categoryId: "groceries", total: 400 },
      { categoryId: "housing", total: 1000 }, // rent, also logged as an expense
      { categoryId: "bills", total: 50 },
      { categoryId: "bills", total: 60 }, // 110 in total: 24.50 above the bills
    ];
    expect(spendingBeyondBills(rows, bills)).toBe(424.5);
  });

  it("gives the same result whether a bill is logged or not", () => {
    expect(spendingBeyondBills([{ categoryId: "groceries", total: 400 }], bills)).toBe(400);
    expect(
      spendingBeyondBills(
        [
          { categoryId: "groceries", total: 400 },
          { categoryId: "housing", total: 1000 },
        ],
        bills,
      ),
    ).toBe(400);
    expect(spendingBeyondBills([], bills)).toBe(0);
  });
});

describe("categorySpending", () => {
  const categories = [
    { id: "g", name: "Groceries", monthlyLimit: 650 },
    { id: "b", name: "Bills", monthlyLimit: 380 },
    { id: "h", name: "Housing", monthlyLimit: null },
  ];

  it("compares spending with limits, most used first", () => {
    const expenses = [
      { categoryId: "g", categoryName: "Groceries", amount: 680.4 },
      { categoryId: "t", categoryName: "Transport (archived)", amount: 30 },
    ];
    expect(categorySpending(categories, expenses)).toEqual([
      { id: "g", name: "Groceries", spent: 680.4, limit: 650, percent: 105 },
      { id: "b", name: "Bills", spent: 0, limit: 380, percent: 0 },
      // Spending in a category that isn't in the active list (e.g. archived) still shows.
      { id: "t", name: "Transport (archived)", spent: 30, limit: null, percent: null },
    ]);
  });

  it("leaves out categories with no limit and no spending", () => {
    expect(categorySpending(categories, []).map(row => row.id)).toEqual(["g", "b"]);
  });
});

describe("goals", () => {
  it("monthsUntil() counts whole months, at least one", () => {
    expect(monthsUntil("2026-11-18", "2027-09-18")).toBe(10);
    expect(monthsUntil("2026-11-18", "2027-09-17")).toBe(9);
    expect(monthsUntil("2026-11-18", "2026-11-25")).toBe(1);
    expect(monthsUntil("2026-11-18", "2026-11-01")).toBeNull(); // passed
    expect(monthsUntil("2026-11-18", null)).toBeNull();
  });

  const base = {
    id: "1",
    name: "Emergency fund",
    note: null,
    targetAmount: 5000,
    targetDate: "2027-09-18",
    status: "active",
    saved: 1000,
    contributionCount: 1,
    contributions: [{ id: "c1", amount: -100, contributedOn: "2026-11-18", userName: "Alex", note: null }],
  };
  const view = item => goalView(item, { currency: "EUR", today: "2026-11-18" });

  it("shows progress and the monthly amount needed to hit the date", () => {
    const result = view(base);
    expect(result).toMatchObject({ percent: 20, savedLabel: "€1,000", targetLabel: "€5,000", reached: false });
    expect(result.planLabel).toBe("Save about €400 a month to reach it by 18 Sept 2027.");
    expect(result.contributions[0].amountLabel).toBe("−€100");
  });

  it("caps progress at 100% and drops the plan once reached", () => {
    const result = view({ ...base, saved: 5200 });
    expect(result).toMatchObject({ percent: 100, reached: true, planLabel: null });
  });

  it("says when the target date has passed", () => {
    expect(view({ ...base, targetDate: "2026-10-01" }).planLabel).toBe("Target date 1 Oct 2026 has passed; €4,000 still to go.");
  });
});

describe("permissions", () => {
  it("lets owners and editors change finance data, but only owners manage members", () => {
    expect(can("editor", "finance:write")).toBe(true);
    expect(can("viewer", "finance:write")).toBe(false);
    expect(can("viewer", "household:read")).toBe(true);
    expect(can("editor", "members:manage")).toBe(false);
    expect(can("owner", "members:manage")).toBe(true);
    expect(can("owner", "no-such-permission")).toBe(false);
    expect(can(undefined, "household:read")).toBe(false);
  });
});
