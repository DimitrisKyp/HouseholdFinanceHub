import { describe, expect, it } from "vitest";
import { goalView, monthlyNeeded } from "@/lib/calculations";
import { formatMoney } from "@/lib/format";
import { forecastView, goalPace, goalProjection, goalsOutlook, monthStart, savingsForecast, typicalSpending } from "@/lib/forecast";

const TODAY = "2026-11-18";

describe("monthStart", () => {
  it("moves across year boundaries", () => {
    expect(monthStart(TODAY)).toBe("2026-11-01");
    expect(monthStart(TODAY, -11)).toBe("2025-12-01");
    expect(monthStart("2026-01-31", -1)).toBe("2025-12-01");
    expect(monthStart(TODAY, 2)).toBe("2027-01-01");
  });
});

describe("typicalSpending", () => {
  const spending = [
    { month: "2026-08-01", total: 1500 },
    { month: "2026-09-01", total: 1200 },
    { month: "2026-10-01", total: 1800 },
    { month: "2026-11-01", total: 400 }, // in progress: ignored
  ];

  it("averages the last 3 full months", () => {
    expect(typicalSpending({ spending, firstExpenseOn: "2026-01-04", today: TODAY })).toEqual({
      amount: 1500, // (1500 + 1200 + 1800) / 3: August to October
      basis: "history",
      months: 3,
    });
  });

  it("uses the spending beyond fixed bills when it's given", () => {
    const withBills = spending.map(row => ({ ...row, total: row.total + 1000, beyondBills: row.total }));
    expect(typicalSpending({ spending: withBills, firstExpenseOn: "2026-01-04", today: TODAY })).toMatchObject({ amount: 1500 });
  });

  it("counts a month with no expenses as zero, but not months before the first expense", () => {
    const sparse = [{ month: "2026-10-01", total: 900 }];
    expect(typicalSpending({ spending: sparse, firstExpenseOn: "2026-08-20", today: TODAY })).toMatchObject({ amount: 300, months: 3 });
    expect(typicalSpending({ spending: sparse, firstExpenseOn: "2026-10-03", today: TODAY })).toMatchObject({ amount: 900, months: 1 });
  });

  it("falls back to category limits, then to nothing, without a full month", () => {
    const recent = { spending: [], firstExpenseOn: "2026-11-02", today: TODAY };
    expect(typicalSpending({ ...recent, limitsTotal: 1030 })).toEqual({ amount: 1030, basis: "limits" });
    expect(typicalSpending({ ...recent, limitsTotal: 0 })).toEqual({ amount: null, basis: "none" });
    expect(typicalSpending({ spending: [], firstExpenseOn: null, today: TODAY })).toEqual({ amount: null, basis: "none" });
  });
});

describe("savingsForecast", () => {
  it("projects the monthly left-over forward", () => {
    expect(savingsForecast({ income: 3000, bills: 1000, spending: { amount: 1810, basis: "history" } })).toEqual({
      monthly: 190,
      horizons: [
        { months: 6, total: 1140 },
        { months: 12, total: 2280 },
      ],
    });
  });

  it("keeps a shortfall negative", () => {
    expect(savingsForecast({ income: 2000, bills: 1500, spending: { amount: 700, basis: "limits" } }).monthly).toBe(-200);
  });

  it("has nothing to say without a budget or a spending basis", () => {
    expect(savingsForecast({ income: 3000, bills: 1000, spending: { amount: null, basis: "none" } })).toBeNull();
    expect(savingsForecast({ income: 0, bills: 0, spending: { amount: 500, basis: "history" } })).toBeNull();
  });
});

describe("goalPace", () => {
  const byMonth = new Map([
    ["2026-08-01", 1000], // the month the goal was created (starting amount): never counted
    ["2026-09-01", 200],
    ["2026-10-01", 100],
  ]);

  it("averages full months after the goal was created", () => {
    expect(goalPace({ createdOn: "2026-08-14", byMonth, today: TODAY })).toEqual({ monthly: 150, months: 2 });
    // An older goal: August is a normal month for it, so (1000 + 200 + 100) / 3.
    expect(goalPace({ createdOn: "2025-01-01", byMonth, today: TODAY })).toEqual({ monthly: 433.33, months: 3 });
  });

  it("is null before the first full month", () => {
    expect(goalPace({ createdOn: "2026-10-30", byMonth, today: TODAY })).toBeNull();
  });
});

describe("goalProjection", () => {
  const goal = { saved: 1000, targetAmount: 2000, today: TODAY };

  it("projects the month the target is reached and compares it with the target date", () => {
    // €1,000 to go at €250 a month: 4 months → March 2027.
    const pace = { monthly: 250, months: 3 };
    expect(goalProjection({ ...goal, pace, targetDate: null })).toEqual({
      status: "projected",
      reachMonth: "2027-03-01",
      monthsLate: null,
    });
    expect(goalProjection({ ...goal, pace, targetDate: "2027-03-31" })).toMatchObject({ monthsLate: 0 });
    expect(goalProjection({ ...goal, pace, targetDate: "2027-06-15" })).toMatchObject({ monthsLate: 0 });
    expect(goalProjection({ ...goal, pace, targetDate: "2026-12-15" })).toMatchObject({ monthsLate: 3 });
  });

  it("reports goals without a usable pace", () => {
    expect(goalProjection({ ...goal, pace: null, targetDate: null })).toEqual({ status: "new" });
    expect(goalProjection({ ...goal, pace: { monthly: -50, months: 3 }, targetDate: null })).toEqual({ status: "stalled" });
  });
});

describe("goal labels", () => {
  const item = {
    id: "g1",
    name: "Car",
    note: null,
    status: "active",
    targetAmount: 2000,
    targetDate: "2026-12-15",
    saved: 1000,
    contributionCount: 0,
    contributions: [],
  };

  it("monthlyNeeded only applies to active, unreached goals with a future date", () => {
    expect(monthlyNeeded(item, TODAY)).toBe(1000); // less than a month left counts as one
    expect(monthlyNeeded({ ...item, status: "paused" }, TODAY)).toBeNull();
    expect(monthlyNeeded({ ...item, saved: 2000 }, TODAY)).toBeNull();
    expect(monthlyNeeded({ ...item, targetDate: "2026-11-01" }, TODAY)).toBeNull();
  });

  it("goalView explains the projection", () => {
    const view = pace => goalView(item, { currency: "EUR", today: TODAY, pace }).forecastLabel;
    expect(view({ monthly: 250, months: 3 })).toBe(
      "At your recent pace (about €250 a month) you'd reach it in March 2027, 3 months after the target date.",
    );
    expect(view({ monthly: 0, months: 1 })).toBe("Nothing added in the last 1 full month, so there's no projected date yet.");
    expect(view(null)).toBe("A projected date appears after its first full month.");
    expect(view(undefined)).toBeNull(); // no pace given (e.g. the dashboard)
    expect(goalView({ ...item, saved: 2500 }, { currency: "EUR", today: TODAY, pace: null }).forecastLabel).toBeNull();
  });
});

describe("goalsOutlook", () => {
  const goals = [
    { status: "active", saved: 1000, targetAmount: 5000, pace: { monthly: 200, months: 3 } },
    { status: "active", saved: 900, targetAmount: 1000, pace: { monthly: 50, months: 3 } }, // reaches its target
    { status: "active", saved: 300, targetAmount: 900, pace: null }, // new: stays as it is
    { status: "paused", saved: 400, targetAmount: 2000, pace: { monthly: 100, months: 3 } }, // paused: stays
    { status: "completed", saved: 700, targetAmount: 700, pace: null }, // not counted
  ];

  it("grows each active goal at its pace, never past its target", () => {
    // 1000 + 1200, 1000 (capped), 300, 400
    expect(goalsOutlook(goals, 6)).toEqual({ later: 3900, monthly: 250 });
  });

  it("is null when no active goal has a pace yet", () => {
    expect(goalsOutlook(goals.slice(2), 6)).toBeNull();
    expect(goalsOutlook([], 6)).toBeNull();
  });
});

describe("forecastView", () => {
  const forecast = savingsForecast({ income: 3000, bills: 1000, spending: { amount: 1810, basis: "history", months: 3 } });
  const base = { forecast, income: 3000, bills: 1000, spending: { amount: 1810, basis: "history", months: 3 }, currency: "EUR" };

  it("explains the numbers and compares them with what the goals need", () => {
    const view = forecastView({ ...base, goalsNeeded: 150 });
    expect(view.monthlyLabel).toBe("€190");
    // Without goals that have a pace, the tiles show the left-over total.
    expect(view.horizons).toEqual([
      { months: 6, valueLabel: "€1,140", detail: "If you put all that's left over aside" },
      { months: 12, valueLabel: "€2,280", detail: "If you put all that's left over aside" },
    ]);
    expect(view.breakdown).toBe("Income €3,000 − fixed bills €1,000 − typical spending €1,810 = €190 a month.");
    expect(view.basisNote).toContain("last 3 full months");
    expect(view.goals).toEqual({ neededLabel: "€150", verdict: "Covered, with €40 a month to spare" });
    expect(forecastView({ ...base, goalsNeeded: 400 }).goals.verdict).toBe("€210 a month more than is left over");
    expect(forecastView({ ...base, goalsNeeded: null }).goals).toBeNull();
  });

  it("shows what the goals would realistically hold, and what saving everything would add", () => {
    const goalList = [{ status: "active", saved: 500, targetAmount: 5000, pace: { monthly: 100, months: 3 } }];
    expect(forecastView({ ...base, goalsNeeded: null, goalList }).horizons[0]).toEqual({
      months: 6,
      valueLabel: "€1,100",
      detail: "In your goals at your recent pace of €100 a month. Saving all that's left over would add €1,140.",
    });
  });

  it("keeps a shortfall a shortfall", () => {
    const short = savingsForecast({ income: 2000, bills: 1500, spending: { amount: 700, basis: "limits" } });
    const goalList = [{ status: "active", saved: 500, targetAmount: 5000, pace: { monthly: 100, months: 3 } }];
    const view = forecastView({ ...base, forecast: short, goalsNeeded: null, goalList });
    expect(view.horizons[0]).toMatchObject({ valueLabel: formatMoney(-1200), detail: "Shortfall if nothing changes" });
  });

  it("is null without a forecast", () => {
    expect(forecastView({ ...base, forecast: null, goalsNeeded: null })).toBeNull();
  });
});
