import { describe, expect, it } from "vitest";
import { field, isUniqueViolation, newPasswordErrors, parseAmount, parseDate, UUID_PATTERN } from "@/lib/forms";

describe("parseAmount", () => {
  it.each([
    ["12", 12],
    ["12.5", 12.5],
    ["12.50", 12.5],
    ["12,50", 12.5], // decimal comma
    ["1,250.00", 1250], // thousands separator
    [" 1 250 ", 1250], // spaces ignored
    ["9999999999.99", 9999999999.99], // largest numeric(12,2)
  ])("reads %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "12.345", "1.2.3", "12e3", "-5", "0", "0.00", "99999999999", null, undefined])("rejects %j", input => {
    expect(parseAmount(input)).toBeNull();
  });

  it("allows zero and negatives only when asked", () => {
    expect(parseAmount("0", { allowZero: true })).toBe(0);
    expect(parseAmount("-20.5", { allowNegative: true })).toBe(-20.5);
    expect(parseAmount("-0", { allowNegative: true })).toBeNull();
  });
});

describe("parseDate", () => {
  it("accepts real calendar dates", () => {
    expect(parseDate("2026-11-18")).toBe("2026-11-18");
    expect(parseDate("2028-02-29")).toBe("2028-02-29"); // leap year
  });

  it.each(["2026-02-29", "2026-13-01", "2026-11-31", "18/11/2026", "2026-1-5", "1999-12-31", "2101-01-01", "", undefined])(
    "rejects %j",
    input => {
      expect(parseDate(input)).toBeNull();
    },
  );
});

describe("form helpers", () => {
  it("field() trims and defaults to an empty string", () => {
    const data = new FormData();
    data.set("name", "  Alex  ");
    expect(field(data, "name")).toBe("Alex");
    expect(field(data, "missing")).toBe("");
  });

  it("newPasswordErrors() checks length and confirmation", () => {
    expect(newPasswordErrors("short", "short")).toEqual({ password: "Use at least 8 characters." });
    expect(newPasswordErrors("long enough", "different")).toEqual({ confirmPassword: "The passwords don't match." });
    expect(newPasswordErrors("long enough", "long enough")).toEqual({});
  });

  it("isUniqueViolation() recognises Postgres error 23505, also when wrapped", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });

  it("UUID_PATTERN only matches UUIDs", () => {
    expect(UUID_PATTERN.test("2c292f56-ca69-41d7-b3d0-92fe22dd26d5")).toBe(true);
    expect(UUID_PATTERN.test("2c292f56-ca69-41d7-b3d0-92fe22dd26d5' or 1=1")).toBe(false);
  });
});
