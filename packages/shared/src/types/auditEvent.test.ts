import { describe, expect, it } from "vitest";
import { auditChange, listAuditEventsQuery } from "./auditEvent.js";

describe("listAuditEventsQuery", () => {
  it("defaults the limit", () => {
    expect(listAuditEventsQuery.parse({})).toEqual({ limit: 50 });
  });

  it("accepts filters", () => {
    const query = { before: "9", limit: "10", action: "month_paid_set", from: "2026-11-01T00:00:00.000Z" };
    expect(listAuditEventsQuery.parse(query)).toEqual({ ...query, limit: 10 });
  });

  it.each([{ limit: "0" }, { limit: "101" }, { action: "nope" }, { from: "2026-11-01" }])("rejects %o", (query) => {
    expect(listAuditEventsQuery.safeParse(query).success).toBe(false);
  });
});

describe("auditChange", () => {
  it("accepts old and new values, references, and changed markers", () => {
    expect(auditChange.safeParse({ from: false, to: true }).success).toBe(true);
    expect(auditChange.safeParse({ from: null, to: { kind: "subscription", id: "1", name: "Kids 2x" } }).success).toBe(
      true,
    );
    expect(auditChange.safeParse({ changed: true }).success).toBe(true);
  });

  it("rejects a change without values", () => {
    expect(auditChange.safeParse({ from: 1 }).success).toBe(false);
  });
});
