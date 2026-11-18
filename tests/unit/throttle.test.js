import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { blockedFor, clearAttempts, countAttempt, tooManyMessage } = await import("@/lib/throttle");

describe("attempt limits", () => {
  const limit = { max: 3, windowMs: 15 * 60_000 };
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-18T10:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it("blocks after the limit until the window has passed", () => {
    for (let i = 0; i < 3; i++) {
      expect(blockedFor("k1", limit)).toBe(0);
      countAttempt("k1", limit);
    }
    expect(blockedFor("k1", limit)).toBe(15);
    vi.advanceTimersByTime(10 * 60_000);
    expect(blockedFor("k1", limit)).toBe(5);
    vi.advanceTimersByTime(5 * 60_000);
    expect(blockedFor("k1", limit)).toBe(0);
  });

  it("starts again after a success, and keys are independent", () => {
    for (let i = 0; i < 3; i++) countAttempt("k2", limit);
    expect(blockedFor("other", limit)).toBe(0);
    clearAttempts("k2");
    expect(blockedFor("k2", limit)).toBe(0);
  });

  it("says how long to wait", () => {
    expect(tooManyMessage(1)).toBe("Too many attempts. Please wait 1 minute and try again.");
    expect(tooManyMessage(12)).toBe("Too many attempts. Please wait 12 minutes and try again.");
  });
});
