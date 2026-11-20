import { describe, expect, it } from "vitest";
import { auditEventKeys, auditEventsPath, dayRangeFilter, nextAuditEventsCursor } from "./auditEvents.js";

describe("auditEventsPath", () => {
  it("has no query without filters", () => {
    expect(auditEventsPath({})).toBe("/audit-events");
  });

  it("adds the set filters and the cursor, and skips empty ones", () => {
    expect(auditEventsPath({ actorId: "3", action: "month_paid_set", memberId: "" }, "40")).toBe(
      "/audit-events?actorId=3&action=month_paid_set&before=40",
    );
  });

  it("encodes datetimes", () => {
    expect(auditEventsPath({ from: "2026-11-01T00:00:00.000Z" })).toBe(
      "/audit-events?from=2026-11-01T00%3A00%3A00.000Z",
    );
  });
});

describe("nextAuditEventsCursor", () => {
  it("returns the cursor, or undefined on the last page", () => {
    expect(nextAuditEventsCursor({ items: [], nextCursor: "12" })).toBe("12");
    expect(nextAuditEventsCursor({ items: [], nextCursor: null })).toBeUndefined();
  });
});

describe("auditEventKeys", () => {
  it("keeps every key under the audit events key", () => {
    expect(auditEventKeys.pages({ action: "member_created" }).slice(0, 1)).toEqual(auditEventKeys.all);
    expect(auditEventKeys.actors().slice(0, 1)).toEqual(auditEventKeys.all);
  });
});

describe("dayRangeFilter", () => {
  it("covers whole local days, the last one included", () => {
    expect(dayRangeFilter("2026-11-01", "2026-11-30")).toEqual({
      from: new Date(2026, 10, 1).toISOString(),
      to: new Date(2026, 11, 1).toISOString(),
    });
  });

  it("leaves out an empty end", () => {
    expect(dayRangeFilter("", "")).toEqual({});
    expect(dayRangeFilter("2026-12-31", "")).toEqual({ from: new Date(2026, 11, 31).toISOString() });
  });
});
