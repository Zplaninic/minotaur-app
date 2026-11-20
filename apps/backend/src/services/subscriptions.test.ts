import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { createMonthSessions, setMonthPaid, setMonthSubscription } from "./attendance.js";
import { systemActor, type Actor } from "./audit.js";
import { addGroupMember, createGroup } from "./groups.js";
import { archiveMember } from "./members.js";
import {
  createSubscription,
  getSubscriptionSummary,
  listOverduePayments,
  listSubscriptions,
  updateSubscription,
} from "./subscriptions.js";

let actor: Actor;
let orgId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  actor = systemActor(Number(orgId));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const kids = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };

describe("createSubscription", () => {
  it("stores the subscription and returns it with an opaque id", async () => {
    const created = await createSubscription(prisma, actor, kids);
    expect(created).toMatchObject({ ...kids, id: expect.any(String) });
  });

  it("rejects a name that is taken", async () => {
    await createSubscription(prisma, actor, kids);
    await expect(
      createSubscription(prisma, actor, { ...kids, sessionsPerWeek: 3 }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("listSubscriptions", () => {
  it("orders by sessions per week, then name", async () => {
    await createSubscription(prisma, actor, { name: "Adults 3x", sessionsPerWeek: 3, price: 6000 });
    await createSubscription(prisma, actor, kids);
    await createSubscription(prisma, actor, { name: "Adults 2x", sessionsPerWeek: 2, price: 5000 });

    const { items } = await listSubscriptions(prisma, actor.orgId);
    expect(items.map((item) => item.name)).toEqual(["Adults 2x", "Kids 2x", "Adults 3x"]);
  });
});

describe("updateSubscription", () => {
  it("replaces every field", async () => {
    const created = await createSubscription(prisma, actor, kids);
    const updated = await updateSubscription(
      prisma,
      actor,
      created.id,
      { name: "Kids 1x", sessionsPerWeek: 1, price: 3000 },
    );
    expect(updated).toMatchObject({ id: created.id, name: "Kids 1x", sessionsPerWeek: 1, price: 3000 });
  });

  it("answers NOT_FOUND for an id that is not a database id", async () => {
    await expect(updateSubscription(prisma, actor, "abc", kids)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fails for an unknown id", async () => {
    await expect(updateSubscription(prisma, actor, "999999", kids)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("payments", () => {
  const TODAY = "2026-11-16";
  let groupId: string;
  let adminId: string;
  let leo: string;
  let nora: string;
  let mia: string;

  // Leo and Nora have Kids 2x in October and November, Mia has none.
  beforeEach(async () => {
    adminId = String((await createLoginMember(prisma, orgId, "admin")).memberId);
    const trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
    groupId = (
      await createGroup(prisma, actor, {
        ownerId: trainerId,
        days: ["monday"],
        from: "17:00",
        to: "18:00",
        ageFrom: null,
        ageTo: null,
        maxMembers: null,
      })
    ).id;
    const child = async (surname: string) => {
      const id = String((await createLoginMember(prisma, orgId, "child", `${surname}@example.com`)).memberId);
      await prisma.member.update({ where: { id: Number(id) }, data: { surname } });
      await addGroupMember(prisma, actor, groupId, id, "2026-10-01");
      return id;
    };
    leo = await child("Perić");
    nora = await child("Jurić");
    mia = await child("Novak");

    const kids = await createSubscription(prisma, actor, kids2x);
    await createMonthSessions(prisma, actor, groupId, "2026-10", "2026-10-01");
    for (const memberId of [leo, nora]) {
      await setMonthSubscription(prisma, actor, { groupId, month: "2026-10", memberId }, kids.id);
    }
    await createMonthSessions(prisma, actor, groupId, "2026-11", TODAY);
  });

  const kids2x = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };
  const pay = (memberId: string, month: string) => setMonthPaid(
    prisma,
    actor,
    { groupId, month, memberId },
    true,
  );

  describe("getSubscriptionSummary", () => {
    it("counts members with a subscription and sums the money", async () => {
      await pay(leo, "2026-10");
      const adults = await createSubscription(
        prisma,
        actor,
        { name: "Adults 3x", sessionsPerWeek: 3, price: 6000 },
      );
      await setMonthSubscription(prisma, actor, { groupId, month: "2026-10", memberId: mia }, adults.id);

      expect(await getSubscriptionSummary(prisma, actor.orgId, "2026-10")).toEqual({
        month: "2026-10",
        members: 3,
        paid: 1,
        unpaid: 2,
        expected: 15000,
        collected: 4500,
        open: 10500,
        bySubscription: [
          { id: adults.id, name: "Adults 3x", members: 1, paid: 0, expected: 6000, collected: 0 },
          { id: expect.any(String), name: "Kids 2x", members: 2, paid: 1, expected: 9000, collected: 4500 },
        ],
      });
    });

    it("keeps the prices a month was set with", async () => {
      const [kids] = (await listSubscriptions(prisma, actor.orgId)).items;
      await updateSubscription(prisma, actor, kids?.id ?? "", { ...kids2x, price: 9900 });
      expect((await getSubscriptionSummary(prisma, actor.orgId, "2026-10")).expected).toBe(9000);
    });

    it("is empty for a month without subscriptions", async () => {
      expect(await getSubscriptionSummary(prisma, actor.orgId, "2026-09")).toMatchObject({ members: 0, expected: 0, bySubscription: [] });
    });
  });

  describe("listOverduePayments", () => {
    it("lists unpaid past months with a subscription, by surname", async () => {
      await pay(nora, "2026-11");
      expect(await listOverduePayments(prisma, actor.orgId, TODAY)).toEqual({
        items: [
          {
            id: nora,
            name: "Test",
            surname: "Jurić",
            months: [{ month: "2026-10", subscription: { id: expect.any(String), name: "Kids 2x" }, price: 4500 }],
            total: 4500,
          },
          {
            id: leo,
            name: "Test",
            surname: "Perić",
            months: [{ month: "2026-10", subscription: { id: expect.any(String), name: "Kids 2x" }, price: 4500 }],
            total: 4500,
          },
        ],
        total: 9000,
      });
    });

    it("leaves out paid months, the current month and archived members", async () => {
      await pay(leo, "2026-10");
      await archiveMember(prisma, { orgId: actor.orgId, memberId: Number(adminId) }, nora, new Date(), TODAY);
      expect(await listOverduePayments(prisma, actor.orgId, TODAY)).toEqual({ items: [], total: 0 });
    });

    it("lists the current month once it has passed", async () => {
      await pay(leo, "2026-10");
      await pay(nora, "2026-10");
      const overdue = await listOverduePayments(prisma, actor.orgId, "2026-12-01");
      expect(overdue.items.map((item) => item.months.map((entry) => entry.month))).toEqual([["2026-11"], ["2026-11"]]);
    });
  });
});
