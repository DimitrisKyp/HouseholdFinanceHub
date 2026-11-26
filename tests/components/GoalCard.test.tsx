// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GoalCard, { type GoalCardItem } from "@/components/Goals/GoalCard";
import { addContributionAction } from "@/lib/actions/goals";

vi.mock("@/lib/actions/goals", () => ({
  addContributionAction: vi.fn(async () => ({ success: "€50 taken from Holiday.", values: {} })),
  setGoalStatusAction: vi.fn(async () => ({})),
  deleteGoalAction: vi.fn(async () => ({})),
}));

const goal: GoalCardItem = {
  id: "g1",
  name: "Holiday",
  note: "Summer trip",
  status: "active",
  reached: false,
  percent: 25,
  savedLabel: "€250",
  targetLabel: "€1,000",
  planLabel: "Save about €150 a month to reach it by 1 Jun 2027.",
  forecastLabel: null,
  contributionCount: 2,
  contributions: [
    { id: "c2", amount: -50, amountLabel: "−€50", dayLabel: "18 Nov 2026", userName: "Alex", note: null },
    { id: "c1", amount: 300, amountLabel: "+€300", dayLabel: "1 Nov 2026", userName: "Maria", note: "Bonus" },
  ],
};

describe("GoalCard", () => {
  it("shows progress, plan and history", () => {
    render(<GoalCard goal={goal} canEdit />);
    expect(screen.getByRole("progressbar", { name: "Holiday progress" })).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("Save about €150 a month to reach it by 1 Jun 2027.")).toBeInTheDocument();
    expect(screen.getByText("History (2 entries)")).toBeInTheDocument();
    expect(screen.getByText("1 Nov 2026 · Maria · Bonus")).toBeInTheDocument();
  });

  it("badges a goal that reached its target but isn't marked completed", () => {
    render(<GoalCard goal={{ ...goal, reached: true, percent: 100 }} canEdit />);
    expect(screen.getByText("Target reached")).toBeInTheDocument();
  });

  it("offers resume instead of adding money when paused", () => {
    render(<GoalCard goal={{ ...goal, status: "paused" }} canEdit />);
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add money" })).not.toBeInTheDocument();
  });

  it("is read-only for viewers", () => {
    render(<GoalCard goal={goal} canEdit={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("sends which button was pressed (withdraw) with the amount", async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={goal} canEdit />);
    await user.type(screen.getByLabelText("Amount for Holiday"), "50");
    await user.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText("€50 taken from Holiday.")).toBeInTheDocument();
    const formData = vi.mocked(addContributionAction).mock.calls[0][1];
    expect(formData.get("direction")).toBe("withdraw");
    expect(formData.get("amount")).toBe("50");
    expect(formData.get("goalId")).toBe("g1");
  });
});
