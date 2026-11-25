import { describe, expect, it } from "vitest";
import {
  addDays,
  alertStage,
  byDueDate,
  daysBetween,
  dueStatus,
  nextDueDate,
  nextRepeatDate,
  occurrence,
  reminderDedupeKey,
} from "@/lib/reminders";

describe("occurrence", () => {
  it("steps weekly, monthly and yearly", () => {
    expect(occurrence("2026-11-05", "weekly", 2)).toBe("2026-11-19");
    expect(occurrence("2026-11-05", "monthly", 3)).toBe("2027-02-05");
    expect(occurrence("2026-11-05", "yearly", 1)).toBe("2027-11-05");
  });

  it("keeps the day of the month where the month has it", () => {
    expect(occurrence("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(occurrence("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(occurrence("2026-01-31", "monthly", 3)).toBe("2026-04-30");
    expect(occurrence("2028-02-29", "yearly", 1)).toBe("2029-02-28");
    expect(occurrence("2028-02-29", "yearly", 4)).toBe("2032-02-29");
  });
});

describe("nextDueDate", () => {
  it("is the first due date until one is paid", () => {
    expect(nextDueDate({ dueOn: "2026-12-01", frequency: "monthly" })).toBe("2026-12-01");
    expect(nextDueDate({ dueOn: null, frequency: "monthly" })).toBeNull();
  });

  it("is the first due date after the last one paid", () => {
    expect(nextDueDate({ dueOn: "2026-10-01", frequency: "monthly", paidThrough: "2026-10-01" })).toBe("2026-11-01");
    expect(nextDueDate({ dueOn: "2026-10-01", frequency: "monthly", paidThrough: "2026-12-01" })).toBe("2027-01-01");
    expect(nextDueDate({ dueOn: "2026-01-01", frequency: "weekly", paidThrough: "2029-06-01" })).toBe("2029-06-07");
    expect(nextDueDate({ dueOn: "2026-03-15", frequency: "yearly", paidThrough: "2026-03-15" })).toBe("2027-03-15");
  });
});

describe("nextRepeatDate", () => {
  it("moves a task done on time or early on by one period from its due date", () => {
    expect(nextRepeatDate("2026-11-25", "daily", "2026-11-25")).toBe("2026-11-26");
    expect(nextRepeatDate("2026-12-01", "monthly", "2026-11-25")).toBe("2027-01-01");
    expect(nextRepeatDate("2027-03-15", "yearly", "2026-11-25")).toBe("2028-03-15");
  });

  it("moves a task done late to its next date after today", () => {
    expect(nextRepeatDate("2026-11-20", "daily", "2026-11-25")).toBe("2026-11-26");
    expect(nextRepeatDate("2026-11-01", "weekly", "2026-11-25")).toBe("2026-11-29");
    expect(nextRepeatDate("2026-10-31", "monthly", "2026-11-25")).toBe("2026-11-30");
  });

  it("steps daily dates years ahead without looping through each one", () => {
    expect(nextRepeatDate("2020-01-01", "daily", "2026-11-25")).toBe("2026-11-26");
  });
});

describe("dates", () => {
  it("counts and adds days across months", () => {
    expect(daysBetween("2026-11-28", "2026-12-02")).toBe(4);
    expect(daysBetween("2026-12-02", "2026-11-28")).toBe(-4);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("dueStatus", () => {
  it("tells overdue, today, soon and later apart", () => {
    expect(dueStatus("2026-11-20", "2026-11-23")).toEqual({ status: "overdue", days: -3 });
    expect(dueStatus("2026-11-23", "2026-11-23")).toEqual({ status: "today", days: 0 });
    expect(dueStatus("2026-11-30", "2026-11-23")).toEqual({ status: "soon", days: 7 });
    expect(dueStatus("2026-12-20", "2026-11-23")).toEqual({ status: "later", days: 27 });
    expect(dueStatus("2026-12-07", "2026-11-23", 14).status).toBe("soon");
  });
});

describe("alertStage", () => {
  it("is upcoming inside the reminder window and due from the due date on", () => {
    expect(alertStage("2026-12-01", "2026-11-25", 3)).toBeNull();
    expect(alertStage("2026-12-01", "2026-11-28", 3)).toBe("upcoming");
    expect(alertStage("2026-12-01", "2026-11-30", 3)).toBe("upcoming");
    expect(alertStage("2026-12-01", "2026-12-01", 3)).toBe("due");
    expect(alertStage("2026-12-01", "2026-12-04", 3)).toBe("due");
  });

  it("only sends the due alert when no days before are asked for", () => {
    expect(alertStage("2026-12-01", "2026-11-30", 0)).toBeNull();
    expect(alertStage("2026-12-01", "2026-12-01", 0)).toBe("due");
  });

  it("has one dedupe key per item, due date and stage", () => {
    expect(reminderDedupeKey("bill", "abc", "2026-12-01", "due")).toBe("reminder:bill:abc:2026-12-01:due");
  });
});

describe("byDueDate", () => {
  it("sorts by date with undated last", () => {
    const items = [{ dueDate: null }, { dueDate: "2026-12-01", status: "soon" }, { dueDate: "2026-11-01", status: "overdue" }];
    expect(items.sort(byDueDate).map(item => item.dueDate)).toEqual(["2026-11-01", "2026-12-01", null]);
  });
});
