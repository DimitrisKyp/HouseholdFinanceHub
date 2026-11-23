import { describe, expect, it } from "vitest";
import { datePresets, parseTransactionFilters, sortHref, transactionsHref } from "@/lib/transaction-filters";

const today = "2026-11-18";
const parse = params => parseTransactionFilters(params, { today });

describe("datePresets", () => {
  it("builds ranges relative to today", () => {
    const presets = Object.fromEntries(datePresets(today).map(p => [p.key, [p.from, p.to]]));
    expect(presets).toEqual({
      "this-month": ["2026-11-01", "2026-11-30"],
      "last-month": ["2026-10-01", "2026-10-31"],
      "90-days": ["2026-08-21", "2026-11-18"],
      "this-year": ["2026-01-01", "2026-12-31"],
      all: ["", ""],
    });
  });

  it("handles January (last month is December of last year) and leap years", () => {
    const [, lastMonth] = datePresets("2028-01-10");
    expect([lastMonth.from, lastMonth.to]).toEqual(["2027-12-01", "2027-12-31"]);
    expect(datePresets("2028-02-10")[0].to).toBe("2028-02-29");
  });
});

describe("parseTransactionFilters", () => {
  it("defaults to this month, newest first, page 1", () => {
    expect(parse({})).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
      categoryId: "",
      paidByUserId: "",
      q: "",
      sort: "date",
      dir: "desc",
      page: 1,
    });
  });

  it("treats present-but-empty dates as 'no limit'", () => {
    expect(parse({ from: "", to: "" })).toMatchObject({ from: null, to: null });
  });

  it("swaps a reversed range", () => {
    expect(parse({ from: "2026-11-10", to: "2026-11-01" })).toMatchObject({ from: "2026-11-01", to: "2026-11-10" });
  });

  it("ignores invalid values instead of failing", () => {
    const filters = parse({ from: "garbage", category: "nope", member: "x'; drop table", sort: "evil", dir: "up", page: "-5" });
    expect(filters).toMatchObject({ from: null, categoryId: "", paidByUserId: "", sort: "date", dir: "desc", page: 1 });
  });

  it("sorts text columns A→Z by default and accepts repeated params", () => {
    expect(parse({ sort: "title" }).dir).toBe("asc");
    expect(parse({ q: ["first", "second"] }).q).toBe("first");
  });

  it("limits the search length", () => {
    expect(parse({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("links", () => {
  const filters = parse({});

  it("always writes the date range and leaves defaults out", () => {
    expect(transactionsHref(filters)).toBe("/transactions?from=2026-11-01&to=2026-11-30");
    expect(transactionsHref(filters, { from: null, to: null })).toBe("/transactions?from=&to=");
    expect(transactionsHref(filters, { q: "rent & bills", page: 2 })).toBe(
      "/transactions?from=2026-11-01&to=2026-11-30&q=rent+%26+bills&page=2",
    );
  });

  it("toggles direction on the active column and resets to page 1", () => {
    const page3 = { ...filters, page: 3 };
    expect(sortHref(page3, "date")).toBe("/transactions?from=2026-11-01&to=2026-11-30&dir=asc");
    expect(sortHref(page3, "amount")).toBe("/transactions?from=2026-11-01&to=2026-11-30&sort=amount");
    expect(sortHref(page3, "title")).toBe("/transactions?from=2026-11-01&to=2026-11-30&sort=title");
  });

  it("round-trips: parsing a generated link gives the same filters", () => {
    const original = { ...filters, q: "50%", sort: "amount", dir: "asc", page: 4, from: null };
    const params = Object.fromEntries(new URL(transactionsHref(original), "http://x").searchParams);
    expect(parse(params)).toEqual(original);
  });
});
