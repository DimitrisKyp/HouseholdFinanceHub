import { afterEach, describe, expect, it, vi } from "vitest";
import { currentMonthRange, formatDay, formatMoney, formatMonth, todayIn } from "@/lib/format";

afterEach(() => vi.useRealTimers());

describe("formatMoney", () => {
  it("drops cents for whole amounts and keeps two decimals otherwise", () => {
    expect(formatMoney(1250, "EUR")).toBe("€1,250");
    expect(formatMoney(12.5, "EUR")).toBe("€12.50");
    expect(formatMoney(0.1 + 0.2, "EUR")).toBe("€0.30");
  });

  it("formats negatives and other currencies", () => {
    expect(formatMoney(-600, "EUR")).toBe("-€600");
    expect(formatMoney(99.99, "USD")).toBe("US$99.99");
  });

  it("treats missing values as zero", () => {
    expect(formatMoney(undefined)).toBe("€0");
  });
});

describe("dates in the household timezone", () => {
  it("todayIn() uses the given timezone, not the server's", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-30T23:30:00Z"));
    expect(todayIn("UTC")).toBe("2026-11-30");
    expect(todayIn("Europe/Athens")).toBe("2026-12-01"); // UTC+2
    expect(todayIn("America/New_York")).toBe("2026-11-30");
  });

  it("currentMonthRange() rolls over the year in December", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-15T12:00:00Z"));
    expect(currentMonthRange("Europe/Athens")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  it("formats days and months without timezone drift", () => {
    expect(formatDay("2026-01-01")).toBe("1 Jan 2026");
    expect(formatMonth("2026-11-18")).toBe("November 2026");
  });
});
