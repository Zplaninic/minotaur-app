import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import {
  addTrainingSession,
  markAttendance,
  setMonthComment,
  setMonthPaid,
  setMonthSubscription,
  unmarkAttendance,
} from "./attendance.js";
import { diff, initial, listAuditEvents, systemActor, type Actor } from "./audit.js";
import { addGroupMember, createGroup, updateGroup } from "./groups.js";
import { createMember, updateMember } from "./members.js";
import { createSubscription, updateSubscription } from "./subscriptions.js";

const TODAY = "2026-11-16";
const MONTH = "2026-11";

let orgId: string;
let actor: Actor;
let admin: Actor;
let trainerId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  actor = systemActor(Number(orgId));
  admin = { orgId: actor.orgId, memberId: (await createLoginMember(prisma, orgId, "admin")).memberId };
  trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const list = (query: Partial<Parameters<typeof listAuditEvents>[2]> = {}) =>
  listAuditEvents(prisma, actor.orgId, { limit: 50, ...query });

const group = {
  ownerId: "",
  days: ["monday", "wednesday"] as ("monday" | "wednesday")[],
  from: "18:00",
  to: "19:00",
  ageFrom: null,
  ageTo: null,
  maxMembers: null,
};

describe("diff", () => {
  it("keeps only changed fields and marks personal ones without values", () => {
    const before = { name: "Ana", paid: false, days: ["monday"] };
    const after = { name: "Iva", paid: true, days: ["monday"] };
    expect(diff(before, after, ["name"])).toEqual({ name: { changed: true }, paid: { from: false, to: true } });
  });

  it("describes a new record as changes from nothing", () => {
    expect(initial({ name: "Kids 2x", ageFrom: null })).toEqual({ name: { from: null, to: "Kids 2x" } });
  });
});

describe("recording", () => {
  it("records who created and edited a member, without personal values", async () => {
    const member = await createMember(
      prisma,
      admin,
      { name: "Marko", surname: "Babić", birthday: "1990-05-01", guardians: [] },
      TODAY,
    );
    await updateMember(
      prisma,
      admin,
      member.id,
      { name: "Mark", surname: "Babić", birthday: "1990-05-01", email: "mark@example.com", guardians: [] },
      TODAY,
    );

    const { items } = await list({ memberId: member.id });
    expect(items.map((event) => event.action)).toEqual(["member_updated", "member_created"]);
    expect(items[0]?.actor?.id).toBe(String(admin?.memberId));
    expect(items[0]?.changes).toEqual({ name: { changed: true }, email: { changed: true } });

    const stored = JSON.stringify(await prisma.auditEvent.findMany());
    expect(stored).not.toContain("Mark");
    expect(stored).not.toContain("mark@example.com");
  });

  it("records nothing for an edit that changes nothing", async () => {
    const body = { name: "Marko", surname: "Babić", birthday: "1990-05-01", guardians: [] };
    const member = await createMember(prisma, admin, body, TODAY);
    await updateMember(prisma, admin, member.id, body, TODAY);
    expect((await list({ action: "member_updated" })).items).toEqual([]);
  });

  it("resolves the group owner to a name", async () => {
    const otherTrainer = String((await createLoginMember(prisma, orgId, "trainer", "other@example.com")).memberId);
    const created = await createGroup(prisma, admin, { ...group, ownerId: trainerId });
    await updateGroup(prisma, admin, created.id, { ...group, ownerId: otherTrainer, to: "19:30", maxMembers: 12 });

    const [updated] = (await list({ action: "group_updated" })).items;
    expect(updated?.group?.id).toBe(created.id);
    expect(updated?.changes).toEqual({
      owner: {
        from: { kind: "member", id: trainerId, name: "Test", surname: "trainer" },
        to: { kind: "member", id: otherTrainer, name: "Test", surname: "trainer" },
      },
      to: { from: "19:00", to: "19:30" },
      maxMembers: { from: null, to: 12 },
    });
  });

  describe("in a month", () => {
    let groupId: string;
    let childId: string;
    let sessionId: string;
    let subscriptionId: string;

    beforeEach(async () => {
      groupId = (await createGroup(prisma, actor, { ...group, ownerId: trainerId })).id;
      childId = String((await createLoginMember(prisma, orgId, "child")).memberId);
      await addGroupMember(prisma, actor, groupId, childId, TODAY);
      sessionId = (await addTrainingSession(prisma, actor, groupId, "2026-11-16", TODAY)).id;
      const subscription = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };
      subscriptionId = (await createSubscription(prisma, actor, subscription)).id;
    });

    const target = () => ({ groupId, month: MONTH, memberId: childId });

    it("records a tick once and the untick", async () => {
      const tick = { groupId, sessionId, memberId: childId };
      await markAttendance(prisma, admin, tick, TODAY);
      await markAttendance(prisma, admin, tick, TODAY);
      await unmarkAttendance(prisma, admin, tick);
      await unmarkAttendance(prisma, admin, tick);

      const { items } = await list({ memberId: childId, groupId });
      expect(items.filter((event) => event.action.startsWith("attendance_")).map((event) => event.action)).toEqual([
        "attendance_unmarked",
        "attendance_marked",
      ]);
      expect(items[0]).toMatchObject({ month: MONTH, date: "2026-11-16", member: { id: childId } });
    });

    it("records the subscription and payment with old and new values", async () => {
      await setMonthSubscription(prisma, admin, target(), subscriptionId);
      await setMonthPaid(prisma, admin, target(), true);
      await updateSubscription(prisma, admin, subscriptionId, { name: "Kids 2x", sessionsPerWeek: 2, price: 5000 });

      const { items } = await list({ actorId: String(admin?.memberId) });
      expect(items.map((event) => [event.action, event.changes])).toEqual([
        ["subscription_updated", { price: { from: 4500, to: 5000 } }],
        ["month_paid_set", { paid: { from: false, to: true } }],
        [
          "month_subscription_set",
          { subscription: { from: null, to: { kind: "subscription", id: subscriptionId, name: "Kids 2x" } } },
        ],
      ]);
    });

    it("marks a comment change without its text", async () => {
      await setMonthComment(prisma, admin, target(), "Knee injury, no jumping");
      const [event] = (await list({ action: "month_comment_set" })).items;
      expect(event?.changes).toEqual({ comment: { changed: true } });
      expect(JSON.stringify(await prisma.auditEvent.findMany())).not.toContain("Knee");
    });

    it("records nothing when the change fails", async () => {
      await expect(setMonthPaid(prisma, admin, target(), true)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect((await list({ action: "month_paid_set" })).items).toEqual([]);
    });
  });
});

describe("listAuditEvents", () => {
  beforeEach(async () => {
    for (const name of ["A", "B", "C"]) {
      await createSubscription(prisma, admin, { name, sessionsPerWeek: 1, price: 1000 });
    }
  });

  it("pages newest first", async () => {
    const first = await list({ limit: 2 });
    expect(first.items.map((event) => event.subscription?.name)).toEqual(["C", "B"]);
    expect(first.nextCursor).toBe(first.items[1]?.id);

    const second = await list({ limit: 2, before: first.nextCursor ?? undefined });
    expect(second.items.map((event) => event.subscription?.name)).toEqual(["A"]);
    expect(second.nextCursor).toBeNull();
  });

  it("filters by time", async () => {
    expect((await list({ from: "2100-01-01T00:00:00.000Z" })).items).toEqual([]);
    expect((await list({ to: "2100-01-01T00:00:00.000Z" })).items).toHaveLength(3);
  });

  it("matches nothing for an id that cannot exist", async () => {
    expect(await list({ actorId: "abc" })).toEqual({ items: [], nextCursor: null });
  });

  it("shows the system as no actor", async () => {
    await createSubscription(prisma, actor, { name: "D", sessionsPerWeek: 1, price: 1000 });
    expect((await list({ limit: 1 })).items[0]?.actor).toBeNull();
  });
});
