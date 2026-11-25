// @vitest-environment jsdom
// Optimistic UI: a new expense or invitation is listed while its Server Action runs, then replaced
// by the server's data, or removed again if the server says no.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpenseTrackerPanel from "@/components/Dashboard/ExpenseTrackerPanel";
import InvitePanel from "@/components/Members/InvitePanel";
import { addExpenseAction } from "@/lib/actions/expenses";
import { inviteMemberAction } from "@/lib/actions/members";

vi.mock("@/lib/actions/expenses", () => ({ addExpenseAction: vi.fn(), deleteExpenseAction: vi.fn() }));
vi.mock("@/lib/actions/members", () => ({ inviteMemberAction: vi.fn(), resendInviteAction: vi.fn(), revokeInviteAction: vi.fn() }));

/**
 * A promise the test settles by hand, standing in for a slow Server Action. Every test settles its
 * own: React waits for all pending actions together, so one left hanging would stall the next test.
 */
function deferred() {
  let resolve;
  const promise = new Promise(done => (resolve = done));
  return { promise, resolve };
}

beforeEach(() => {
  vi.mocked(addExpenseAction).mockReset();
  vi.mocked(inviteMemberAction).mockReset();
});

describe("adding an expense", () => {
  const props = {
    categories: [{ id: "c-groceries", name: "Groceries" }],
    members: [],
    currentUserId: "u1",
    today: "2026-11-18",
    canEdit: true,
    onOpenBreakdown: () => {},
    currency: "EUR",
    recentExpenses: [{ id: "e1", title: "Bus pass", amountLabel: "€30", detail: "2 Nov 2026 · Transport" }],
  };

  async function submit(user, { title, amount }) {
    if (title) await user.type(screen.getByLabelText("Description (optional)"), title);
    await user.type(screen.getByLabelText("Amount"), amount);
    await user.selectOptions(screen.getByLabelText("Category"), "Groceries");
    await user.click(screen.getByRole("button", { name: "Add expense" }));
  }

  it("lists it straight away while it's saved", async () => {
    const save = deferred();
    vi.mocked(addExpenseAction).mockReturnValue(save.promise);
    const user = userEvent.setup();
    render(<ExpenseTrackerPanel {...props} />);

    await submit(user, { title: "Bakery", amount: "4,50" });
    const recent = screen.getByRole("list", { name: "Recent expenses" });
    const rows = within(recent).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Bakery");
    expect(rows[0]).toHaveTextContent("Saving… · 18 Nov 2026 · Groceries");
    expect(rows[0]).toHaveTextContent("€4.50");
    expect(rows[0]).toHaveAttribute("aria-busy", "true");

    save.resolve({ success: "Bakery (€4.50) added.", values: {} });
    // The server's list (unchanged in this test, as props don't change) takes over again.
    expect(await screen.findByText("Bakery (€4.50) added.")).toBeInTheDocument();
    expect(within(recent).getAllByRole("listitem")).toHaveLength(1);
  });

  it("goes by its category when it has no description", async () => {
    const save = deferred();
    vi.mocked(addExpenseAction).mockReturnValue(save.promise);
    const user = userEvent.setup();
    render(<ExpenseTrackerPanel {...props} />);

    await submit(user, { title: "", amount: "12" });
    const [row] = within(screen.getByRole("list", { name: "Recent expenses" })).getAllByRole("listitem");
    expect(row).toHaveTextContent("Groceries");
    expect(row).toHaveTextContent("Saving… · 18 Nov 2026€12");

    save.resolve({ success: "Groceries (€12) added.", values: {} });
    expect(await screen.findByText("Groceries (€12) added.")).toBeInTheDocument();
  });

  it("removes it again when the server refuses", async () => {
    const save = deferred();
    vi.mocked(addExpenseAction).mockReturnValue(save.promise);
    const user = userEvent.setup();
    render(<ExpenseTrackerPanel {...props} />);

    await submit(user, { title: "Bakery", amount: "4.50" });
    expect(screen.getByText("Bakery")).toBeInTheDocument();
    save.resolve({ errors: { categoryId: "Choose a category." }, values: { title: "Bakery", amount: "4.50" } });
    expect(await screen.findByText("Choose a category.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Recent expenses" })).queryByText("Bakery")).not.toBeInTheDocument();
  });

  it("doesn't list what the server will reject anyway", async () => {
    const save = deferred();
    vi.mocked(addExpenseAction).mockReturnValue(save.promise);
    const user = userEvent.setup();
    render(<ExpenseTrackerPanel {...props} />);

    await submit(user, { title: "Bakery", amount: "abc" });
    expect(within(screen.getByRole("list", { name: "Recent expenses" })).getAllByRole("listitem")).toHaveLength(1);
    save.resolve({ errors: { amount: "Enter an amount above zero, e.g. 45 or 12.50." }, values: {} });
    expect(await screen.findByText("Enter an amount above zero, e.g. 45 or 12.50.")).toBeInTheDocument();
  });
});

describe("sending an invitation", () => {
  const invites = [{ id: "i1", email: "sam@example.com", role: "viewer", expired: false, expiresLabel: "25 Nov 2026" }];

  it("lists it as sending, without actions, until it's saved", async () => {
    const send = deferred();
    vi.mocked(inviteMemberAction).mockReturnValue(send.promise);
    const user = userEvent.setup();
    render(<InvitePanel invites={invites} />);

    await user.type(screen.getByLabelText("Email address"), "Alex@Example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const list = screen.getByRole("list", { name: "Pending invitations" });
    const sending = within(list).getByText("alex@example.com").closest("li");
    expect(sending).toHaveTextContent("Editor · Sending…");
    expect(within(sending).queryByRole("button")).not.toBeInTheDocument();

    send.resolve({ error: "The invitation was saved, but the email couldn't be sent." });
    expect(await screen.findByText(/the email couldn't be sent/)).toBeInTheDocument();
    expect(within(list).queryByText("alex@example.com")).not.toBeInTheDocument();
  });

  it("re-inviting a pending address replaces its row instead of adding one", async () => {
    const send = deferred();
    vi.mocked(inviteMemberAction).mockReturnValue(send.promise);
    const user = userEvent.setup();
    render(<InvitePanel invites={invites} />);

    await user.type(screen.getByLabelText("Email address"), "sam@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const rows = within(screen.getByRole("list", { name: "Pending invitations" })).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Sending…");
    send.resolve({ success: "Invitation sent to sam@example.com.", values: { email: "", role: "editor" } });
    expect(await screen.findByText("Invitation sent to sam@example.com.")).toBeInTheDocument();
  });
});
