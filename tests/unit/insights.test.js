import { describe, expect, it } from "vitest";
import { monthlySeries, niceTicks, parseInsightRange, rangeMonths, topCategories } from "@/lib/insights";

describe("rangeMonths", () => {
  it("covers the last 6 months including the current one", () => {
    const { months, from, to } = rangeMonths("6m", "2026-11-18");
    expect(months.map(m => m.start)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(months[1].end).toBe("2026-07-31");
    expect([from, to]).toEqual(["2026-06-01", "2026-12-01"]);
  });

  it("crosses year boundaries for 12 months, and 'this year' starts in January", () => {
    expect(rangeMonths("12m", "2026-03-05").months[0].start).toBe("2025-04-01");
    expect(rangeMonths("ytd", "2026-03-05").months).toHaveLength(3);
    expect(rangeMonths("6m", "2026-12-31").to).toBe("2027-01-01");
  });

  it("falls back to 6 months for unknown range keys", () => {
    expect(parseInsightRange("12m")).toBe("12m");
    expect(parseInsightRange("forever")).toBe("6m");
    expect(parseInsightRange(undefined)).toBe("6m");
  });
});

describe("monthlySeries", () => {
  it("applies the budget baseline to every month and marks the current one", () => {
    const { months } = rangeMonths("6m", "2026-11-18");
    const series = monthlySeries({
      months,
      spending: [
        { month: "2026-06-01", total: 2600 },
        { month: "2026-11-01", total: 640 },
      ],
      baseline: { income: 3000, bills: 1000 },
      today: "2026-11-18",
    });
    expect(series[0]).toEqual({ month: "2026-06-01", spent: 2600, net: -600, current: false });
    expect(series[1]).toMatchObject({ spent: 0, net: 2000 }); // no expenses that month
    expect(series.at(-1)).toMatchObject({ spent: 640, net: 1360, current: true });
  });
});

describe("topCategories", () => {
  it("folds the tail into Other and adds shares", () => {
    const rows = ["A", "B", "C", "D"].map((name, i) => ({ id: name, name, total: 40 - i * 10 })); // 40, 30, 20, 10
    expect(topCategories(rows, 2)).toEqual([
      { id: "A", name: "A", total: 40, share: 40 },
      { id: "B", name: "B", total: 30, share: 30 },
      { id: "other", name: "Other (2)", total: 30, share: 30 },
    ]);
  });

  it("handles no spending", () => {
    expect(topCategories([])).toEqual([]);
  });
});

describe("niceTicks", () => {
  it("uses round steps from zero up past the maximum", () => {
    expect(niceTicks(0, 2600)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(0, 3000)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(0, 95)).toEqual([0, 25, 50, 75, 100]);
  });

  it("extends below zero for negative values", () => {
    expect(niceTicks(-600, 1360)).toEqual([-1000, -500, 0, 500, 1000, 1500]);
  });

  it("returns a usable axis when everything is zero", () => {
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});
