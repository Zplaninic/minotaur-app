import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { createMonthSessions, getGroupAttendance, markAttendance, setMonthSubscription } from "./attendance.js";
import { getDashboard } from "./dashboard.js";
import { addGroupMember, archiveGroup, createGroup } from "./groups.js";
import { archiveMember } from "./members.js";
import { createSubscription } from "./subscriptions.js";

// A Monday. November's Monday and Wednesday sessions up to today: 2, 4, 9, 11, 16.
const TODAY = "2026-11-16";

let adminId: string;
let trainerId: string;
let orgId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  adminId = String((await createLoginMember(prisma, orgId, "admin")).memberId);
  trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const child = async (surname: string): Promise<string> => {
  const id = String((await createLoginMember(prisma, orgId, "child", `${surname}@example.com`)).memberId);
  await prisma.member.update({ where: { id: Number(id) }, data: { surname } });
  return id;
};

const groupWith = async (days: ("monday" | "wednesday")[], memberIds: string[]): Promise<string> => {
  const { id } = await createGroup(prisma, {
    ownerId: trainerId,
    days,
    from: "17:00",
    to: "18:00",
    ageFrom: null,
    ageTo: null,
  });
  for (const memberId of memberIds) {
    await addGroupMember(prisma, id, memberId, TODAY);
  }
  await createMonthSessions(prisma, id, "2026-11", TODAY);
  return id;
};

const sessionIds = async (groupId: string): Promise<string[]> =>
  (await getGroupAttendance(prisma, groupId, "2026-11")).sessions.map((session) => session.id);

describe("getDashboard", () => {
  it("is empty for a gym with no groups", async () => {
    expect(await getDashboard(prisma, TODAY)).toEqual({
      today: TODAY,
      month: "2026-11",
      activeMembers: 0,
      withoutSubscription: [],
      attendance: { expected: 0, attended: 0 },
    });
  });

  it("counts members, lists those without a subscription, and sums attendance up to today", async () => {
    const leo = await child("Perić");
    const nora = await child("Jurić");
    const mia = await child("Novak");
    const climbing = await groupWith(["monday", "wednesday"], [leo, nora, mia]);
    const bouldering = await groupWith(["wednesday"], [nora]);

    const kids = await createSubscription(prisma, { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 });
    await setMonthSubscription(prisma, { groupId: climbing, month: "2026-11", memberId: leo }, kids.id);

    const [first, second, , , sixteenth, eighteenth] = await sessionIds(climbing);
    for (const [sessionId, memberId] of [
      [first, leo],
      [second, leo],
      [sixteenth, nora],
      [first, mia],
      // After today, so not counted.
      [eighteenth, nora],
    ] as const) {
      await markAttendance(prisma, { groupId: climbing, sessionId: sessionId ?? "", memberId }, "2026-11-30");
    }
    await archiveMember(prisma, mia, adminId, new Date(), TODAY);

    expect(await getDashboard(prisma, TODAY)).toEqual({
      today: TODAY,
      month: "2026-11",
      activeMembers: 2,
      withoutSubscription: [{ id: nora, name: "Test", surname: "Jurić", groupIds: [climbing, bouldering] }],
      // Climbing: 5 sessions x 2 active members. Bouldering: 2 sessions (4, 11) x 1.
      attendance: { expected: 12, attended: 3 },
    });
  });

  it("leaves out archived groups", async () => {
    const leo = await child("Perić");
    const climbing = await groupWith(["monday"], [leo]);
    await archiveGroup(prisma, climbing, new Date());

    expect(await getDashboard(prisma, TODAY)).toMatchObject({
      activeMembers: 1,
      withoutSubscription: [],
      attendance: { expected: 0, attended: 0 },
    });
  });
});
