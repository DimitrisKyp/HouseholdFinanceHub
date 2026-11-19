import { describe, expect, it } from "vitest";
import {
  budgetAlertMessage,
  budgetDedupeKey,
  budgetThreshold,
  goalReachedMessage,
  memberJoinedMessage,
  renderNotification,
  roleChangedMessage,
  welcomeMessage,
} from "@/lib/notification-messages";

describe("budgetThreshold", () => {
  it("returns the highest share of the limit reached", () => {
    expect(budgetThreshold(519, 650)).toBeNull(); // 79.8%
    expect(budgetThreshold(520, 650)).toBe(80);
    expect(budgetThreshold(650, 650)).toBe(100);
    expect(budgetThreshold(900, 650)).toBe(100);
  });

  it("ignores categories without a limit, and treats a zero limit as any spending being over", () => {
    expect(budgetThreshold(500, null)).toBeNull();
    expect(budgetThreshold(10, 0)).toBe(100);
    expect(budgetThreshold(0, 0)).toBeNull();
  });

  it("keys alerts by category, month and threshold", () => {
    expect(budgetDedupeKey("cat-1", "2026-11-01", 80)).toBe("budget:cat-1:2026-11:80");
  });
});

describe("budgetAlertMessage", () => {
  const base = { categoryName: "Groceries", limit: 650, month: "2026-11-01", currency: "EUR" };

  it("says how close the category is", () => {
    expect(budgetAlertMessage({ ...base, spent: 530, threshold: 80 })).toMatchObject({
      title: "Groceries is at 81% of its budget",
      body: "€530 spent of €650 in November 2026, €120 left.",
    });
  });

  it("says when it's reached or over", () => {
    expect(budgetAlertMessage({ ...base, spent: 650, threshold: 100 }).title).toBe("Groceries has reached its budget");
    expect(budgetAlertMessage({ ...base, spent: 740.5, threshold: 100 })).toMatchObject({
      title: "Groceries is over budget",
      body: "€740.50 spent of €650 in November 2026: €90.50 over.",
    });
  });
});

describe("other messages", () => {
  it("goal reached", () => {
    expect(goalReachedMessage({ goalName: "Bike", saved: 520, targetAmount: 500, currency: "EUR" }).title).toBe("Goal reached: Bike");
  });

  it("members joining and role changes", () => {
    expect(memberJoinedMessage({ memberName: "Nova", role: "editor", householdName: "Home" }).title).toBe("Nova joined Home");
    expect(welcomeMessage({ householdName: "Home", role: "viewer", inviterName: "Sam" }).body).toBe(
      "Sam invited you as Viewer. You can see everything but can't make changes.",
    );
    expect(roleChangedMessage({ role: "editor", householdName: "Home" }).title).toBe("You're now an Editor in Home");
    expect(roleChangedMessage({ role: "viewer", householdName: "Home" }).title).toBe("You're now a Viewer in Home");
  });
});

describe("renderNotification", () => {
  const alert = budgetAlertMessage({
    categoryName: "Groceries",
    limit: 650,
    month: "2026-11-01",
    currency: "EUR",
    spent: 740.5,
    threshold: 100,
  });

  it("stores the values, so a notification can be shown in the reader's language", () => {
    expect(alert.data).toEqual({
      kind: "budget",
      categoryName: "Groceries",
      spent: 740.5,
      limit: 650,
      month: "2026-11-01",
      threshold: 100,
      currency: "EUR",
    });
    expect(renderNotification(alert, "el")).toEqual({
      title: "«Groceries»: εκτός προϋπολογισμού",
      body: "Δαπάνες 740,50 € από 650 € (Νοέμβριος 2026): 90,50 € πάνω από το όριο.",
    });
  });

  it("translates role names", () => {
    expect(renderNotification(roleChangedMessage({ role: "viewer", householdName: "Home" }), "el").title).toBe(
      "Ο ρόλος σας στο «Home» είναι πλέον Αναγνώστης",
    );
  });

  it("falls back to the stored English text for notifications without values", () => {
    expect(renderNotification({ data: null, title: "Old title", body: "Old body" }, "el")).toEqual({
      title: "Old title",
      body: "Old body",
    });
  });
});
