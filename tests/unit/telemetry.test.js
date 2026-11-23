import { describe, expect, it } from "vitest";
import { pathOnly, sanitizeClientEvent } from "@/lib/telemetry-events";

describe("telemetry events", () => {
  it("never keeps query strings, which can contain searches", () => {
    expect(pathOnly("/transactions?q=rent#top")).toBe("/transactions");
    expect(sanitizeClientEvent({ type: "page_view", path: "/goals?x=1", userId: "u1", email: "a@b.c" })).toEqual({
      type: "page_view",
      path: "/goals",
    });
  });

  it("accepts Core Web Vitals with a known name and a number", () => {
    expect(sanitizeClientEvent({ type: "web_vital", path: "/", name: "LCP", value: 1234.5678, rating: "good" })).toEqual({
      type: "web_vital",
      path: "/",
      name: "LCP",
      value: 1234.568,
      rating: "good",
    });
    expect(sanitizeClientEvent({ type: "web_vital", name: "Nope", value: 1 })).toBeNull();
    expect(sanitizeClientEvent({ type: "web_vital", name: "CLS", value: "a lot" })).toBeNull();
  });

  it("shortens error messages and drops unknown events", () => {
    const event = sanitizeClientEvent({ type: "client_error", path: "/", message: "x".repeat(1000), source: "window" });
    expect(event.message).toHaveLength(300);
    expect(sanitizeClientEvent({ type: "something_else" })).toBeNull();
    expect(sanitizeClientEvent(null)).toBeNull();
  });
});
