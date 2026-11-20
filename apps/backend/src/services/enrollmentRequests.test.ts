import type { CreateEnrollmentRequestBody } from "@repo/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { listAuditEvents, SYSTEM_ACTOR } from "./audit.js";
import {
  acceptEnrollmentChild,
  createEnrollmentRequest,
  deleteEnrollmentRequest,
  listEnrollmentRequests,
  rejectEnrollmentChild,
  reopenEnrollmentChild,
  setEnrollmentChildGroup,
} from "./enrollmentRequests.js";
import { archiveGroup, createGroup, listGroupMembers } from "./groups.js";

const TODAY = "2026-11-20";

let orgId: string;
let trainerId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const addGroup = async (ageFrom: number | null, ageTo: number | null, maxMembers: number | null = null) =>
  (
    await createGroup(prisma, SYSTEM_ACTOR, {
      ownerId: trainerId,
      days: ["monday"],
      from: "17:00",
      to: "18:00",
      ageFrom,
      ageTo,
      maxMembers,
    })
  ).id;

// Fake data only.
const body = (children: CreateEnrollmentRequestBody["children"]): CreateEnrollmentRequestBody => ({
  parentName: "Ivan",
  parentSurname: "Horvat",
  parentPhone: "091 000 0000",
  parentEmail: "parent@example.com",
  rawText: "Ime Roditelja: Ivan Horvat",
  children,
});

describe("createEnrollmentRequest", () => {
  it("saves the parent and children and recommends a group per child by age", async () => {
    const small = await addGroup(4, 6);
    const big = await addGroup(9, 12);
    const created = await createEnrollmentRequest(
      prisma,
      SYSTEM_ACTOR,
      body([
        { name: "Jan", age: 9 },
        { name: "Eva", age: 4.5 },
        { name: "Ana", age: 15 },
      ]),
    );
    expect(created).toMatchObject({
      parentName: "Ivan",
      parentSurname: "Horvat",
      parentEmail: "parent@example.com",
      children: [
        { name: "Jan", age: 9, status: "pending", groupId: big, memberId: null },
        { name: "Eva", age: 4.5, status: "pending", groupId: small, memberId: null },
        { name: "Ana", age: 15, status: "pending", groupId: null },
      ],
    });
  });

  it("counts pending children, siblings included, toward a group's free spots", async () => {
    const first = await addGroup(4, 6, 1);
    const second = await addGroup(4, 6, 1);
    const created = await createEnrollmentRequest(
      prisma,
      SYSTEM_ACTOR,
      body([
        { name: "Jan", age: 5 },
        { name: "Eva", age: 5 },
      ]),
    );
    expect(created.children.map((child) => child.groupId)).toEqual([first, second]);
  });

  it("skips archived groups", async () => {
    await archiveGroup(prisma, SYSTEM_ACTOR, await addGroup(null, null), new Date());
    const created = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 5 }]));
    expect(created.children[0]?.groupId).toBeNull();
  });
});

describe("acceptEnrollmentChild", () => {
  it("creates the member and guardian, adds the member to the group, and shares the guardian with siblings", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(
      prisma,
      SYSTEM_ACTOR,
      body([
        { name: "Jan", age: 9 },
        { name: "Eva", age: 5 },
      ]),
    );
    const [jan, eva] = request.children;
    if (!jan || !eva) throw new Error("expected two children");

    const accept = (childId: string) =>
      acceptEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId, { orgId, surname: "Horvat", groupId }, TODAY);
    await accept(jan.id);
    const after = await accept(eva.id);

    expect(after.children.map((child) => child.status)).toEqual(["accepted", "accepted"]);
    const members = await listGroupMembers(prisma, groupId);
    expect(members.items.map((member) => [member.name, member.surname])).toEqual([
      ["Eva", "Horvat"],
      ["Jan", "Horvat"],
    ]);
    const guardianIds = new Set(members.items.flatMap((member) => member.guardians.map((guardian) => guardian.id)));
    expect(guardianIds.size).toBe(1);
    expect(members.items[0]?.guardians[0]).toMatchObject({
      name: "Ivan",
      surname: "Horvat",
      email: "parent@example.com",
      phone: "091 000 0000",
    });
    expect(after.children.every((child) => child.memberId !== null)).toBe(true);
    expect(members.items.every((member) => member.isNew)).toBe(true);
  });

  it("refuses a child who is no longer pending, and changes nothing", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const childId = request.children[0]?.id ?? "";
    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId);

    await expect(
      acceptEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId, { orgId, surname: "Horvat", groupId }, TODAY),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.guardian.count()).toBe(0);
    expect(await prisma.member.count({ where: { role: "child" } })).toBe(0);
  });

  it("answers NOT_FOUND for an archived group", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    await archiveGroup(prisma, SYSTEM_ACTOR, groupId, new Date());
    await expect(
      acceptEnrollmentChild(
        prisma,
        SYSTEM_ACTOR,
        request.id,
        request.children[0]?.id ?? "",
        { orgId, surname: "Horvat", groupId },
        TODAY,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("setEnrollmentChildGroup", () => {
  it("changes and clears a pending child's group", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const childId = request.children[0]?.id ?? "";
    expect((await setEnrollmentChildGroup(prisma, SYSTEM_ACTOR, request.id, childId, null)).children[0]?.groupId).toBe(
      null,
    );
    expect(
      (await setEnrollmentChildGroup(prisma, SYSTEM_ACTOR, request.id, childId, groupId)).children[0]?.groupId,
    ).toBe(groupId);
  });

  it("answers NOT_FOUND for a child of another request", async () => {
    const one = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const other = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Eva", age: 5 }]));
    await expect(
      setEnrollmentChildGroup(prisma, SYSTEM_ACTOR, one.id, other.children[0]?.id ?? "", null),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listEnrollmentRequests and deleteEnrollmentRequest", () => {
  it("lists open and rejected requests apart, newest first, and deletes for good", async () => {
    const first = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const second = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Eva", age: 5 }]));
    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, first.id, first.children[0]?.id ?? "");

    const open = await listEnrollmentRequests(prisma, { state: "open", page: 1, pageSize: 20 });
    const closed = await listEnrollmentRequests(prisma, { state: "closed", page: 1, pageSize: 20 });
    const rejected = await listEnrollmentRequests(prisma, { state: "rejected", page: 1, pageSize: 20 });
    expect(open.items.map((request) => request.id)).toEqual([second.id]);
    // Nobody was accepted, so the request is rejected but not done.
    expect(closed.items).toEqual([]);
    expect(rejected.items.map((request) => request.id)).toEqual([first.id]);

    await deleteEnrollmentRequest(prisma, SYSTEM_ACTOR, first.id);
    expect(await prisma.enrollmentChild.count()).toBe(1);
    await expect(deleteEnrollmentRequest(prisma, SYSTEM_ACTOR, first.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("states and reopenEnrollmentChild", () => {
  const ids = async (state: "open" | "closed" | "rejected") =>
    (await listEnrollmentRequests(prisma, { state, page: 1, pageSize: 20 })).items.map((request) => request.id);

  it("lists a request with an accepted and a rejected child in both closed and rejected", async () => {
    const groupId = await addGroup(null, null);
    const mixed = await createEnrollmentRequest(
      prisma,
      SYSTEM_ACTOR,
      body([
        { name: "Jan", age: 9 },
        { name: "Eva", age: 5 },
      ]),
    );
    const allRejected = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Lea", age: 6 }]));
    const [jan, eva] = mixed.children;
    await acceptEnrollmentChild(
      prisma,
      SYSTEM_ACTOR,
      mixed.id,
      jan?.id ?? "",
      { orgId, surname: "Horvat", groupId },
      TODAY,
    );
    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, mixed.id, eva?.id ?? "");
    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, allRejected.id, allRejected.children[0]?.id ?? "");

    expect(await ids("open")).toEqual([]);
    expect(await ids("closed")).toEqual([mixed.id]);
    expect(await ids("rejected")).toEqual([allRejected.id, mixed.id]);
  });

  it("puts a rejected child back to waiting with its group, and refuses one that is not rejected", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const childId = request.children[0]?.id ?? "";
    await expect(reopenEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId)).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId);
    const reopened = await reopenEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, childId);
    expect(reopened.children[0]).toMatchObject({ status: "pending", groupId });
    expect(await ids("open")).toEqual([request.id]);
    await expect(reopenEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, "999999")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("review fixes", () => {
  const accept = (requestId: string, childId: string, groupId: string, surname = "Horvat") =>
    acceptEnrollmentChild(prisma, SYSTEM_ACTOR, requestId, childId, { orgId, surname, groupId }, TODAY);

  it("accepts an adult as a member without a guardian", async () => {
    const groupId = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Luka", age: 20 }]));
    const after = await accept(request.id, request.children[0]?.id ?? "", groupId);

    const member = await prisma.member.findUniqueOrThrow({
      where: { id: Number(after.children[0]?.memberId) },
      select: { role: true, guardians: true },
    });
    expect(member).toEqual({ role: "member", guardians: [] });
    expect(await prisma.guardian.count()).toBe(0);
  });

  it("refuses a second open request for the same child from the same parent", async () => {
    await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    await expect(
      createEnrollmentRequest(prisma, SYSTEM_ACTOR, { ...body([{ name: "JAN", age: 9 }]), parentEmail: "Parent@Example.com" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    // A sibling from the same parent is fine.
    await expect(createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Eva", age: 5 }]))).resolves.toBeDefined();
  });

  it("reuses the guardian the parent already has and refuses a child who is already a member", async () => {
    const groupId = await addGroup(null, null);
    const first = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    await accept(first.id, first.children[0]?.id ?? "", groupId);

    // The parent writes again later, by phone only, for a sibling and for Jan again.
    const second = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, {
      parentName: "Ivan",
      parentPhone: "0910000000",
      children: [
        { name: "Eva", age: 5 },
        { name: "Jan", age: 9 },
      ],
    });
    const [eva, jan] = second.children;
    await accept(second.id, eva?.id ?? "", groupId);
    expect(await prisma.guardian.count()).toBe(1);

    await expect(accept(second.id, jan?.id ?? "", groupId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns no group for a child whose group was archived, and counts waiting children per group", async () => {
    const kept = await addGroup(9, 12);
    const archived = await addGroup(4, 6);
    const request = await createEnrollmentRequest(
      prisma,
      SYSTEM_ACTOR,
      body([
        { name: "Jan", age: 9 },
        { name: "Eva", age: 5 },
      ]),
    );
    await archiveGroup(prisma, SYSTEM_ACTOR, archived, new Date());

    const list = await listEnrollmentRequests(prisma, { state: "open", page: 1, pageSize: 20 });
    expect(list.items[0]?.children.map((child) => child.groupId)).toEqual([kept, null]);
    expect(list.waitingByGroup).toEqual({ [kept]: 1 });
    expect(request.children[1]?.groupId).toBe(archived);
  });

  it("does not change the group of a child who is no longer waiting", async () => {
    const groupId = await addGroup(null, null);
    const other = await addGroup(null, null);
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    const childId = request.children[0]?.id ?? "";
    await accept(request.id, childId, groupId);
    await expect(setEnrollmentChildGroup(prisma, SYSTEM_ACTOR, request.id, childId, other)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("names the child in the activity log", async () => {
    const request = await createEnrollmentRequest(prisma, SYSTEM_ACTOR, body([{ name: "Jan", age: 9 }]));
    await rejectEnrollmentChild(prisma, SYSTEM_ACTOR, request.id, request.children[0]?.id ?? "");
    const log = await listAuditEvents(prisma, { limit: 10 });
    expect(log.items.find((event) => event.action === "enrollment_child_rejected")?.enrollmentChild).toEqual({
      id: request.children[0]?.id,
      name: "Jan",
    });
  });
});
