import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { createSubscription, listSubscriptions, updateSubscription } from "./subscriptions.js";

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const kids = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };

describe("createSubscription", () => {
  it("stores the subscription and returns it with an opaque id", async () => {
    const created = await createSubscription(prisma, kids);
    expect(created).toMatchObject({ ...kids, id: expect.any(String) });
  });

  it("rejects a name that is taken", async () => {
    await createSubscription(prisma, kids);
    await expect(createSubscription(prisma, { ...kids, sessionsPerWeek: 3 })).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("listSubscriptions", () => {
  it("orders by sessions per week, then name", async () => {
    await createSubscription(prisma, { name: "Adults 3x", sessionsPerWeek: 3, price: 6000 });
    await createSubscription(prisma, kids);
    await createSubscription(prisma, { name: "Adults 2x", sessionsPerWeek: 2, price: 5000 });

    const { items } = await listSubscriptions(prisma);
    expect(items.map((item) => item.name)).toEqual(["Adults 2x", "Kids 2x", "Adults 3x"]);
  });
});

describe("updateSubscription", () => {
  it("replaces every field", async () => {
    const created = await createSubscription(prisma, kids);
    const updated = await updateSubscription(prisma, created.id, { name: "Kids 1x", sessionsPerWeek: 1, price: 3000 });
    expect(updated).toMatchObject({ id: created.id, name: "Kids 1x", sessionsPerWeek: 1, price: 3000 });
  });

  it("answers NOT_FOUND for an id that is not a database id", async () => {
    await expect(updateSubscription(prisma, "abc", kids)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fails for an unknown id", async () => {
    await expect(updateSubscription(prisma, "999999", kids)).rejects.toMatchObject({ code: "P2025" });
  });
});
