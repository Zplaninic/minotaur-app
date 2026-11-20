import { recommendGroups, type GroupCapacity } from "@repo/enrollment";
import {
  ADULT_AGE,
  DEFAULT_MEMBER_ROLE,
  type AcceptEnrollmentChildBody,
  type MemberRole,
  type CreateEnrollmentRequestBody,
  type EnrollmentChildStatus,
  type EnrollmentRequestState,
  type EnrollmentRequestResponse,
  type ListEnrollmentRequestsQuery,
  type ListEnrollmentRequestsResponse,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { joinGroup } from "./attendance.js";
import { recordEvent, type Actor } from "./audit.js";
import { requireDbId, toApiId } from "./ids.js";

type Tx = Prisma.TransactionClient;

const requestSelect = {
  id: true,
  parentName: true,
  parentSurname: true,
  parentPhone: true,
  parentEmail: true,
  rawText: true,
  createdAt: true,
  children: {
    select: {
      id: true,
      name: true,
      age: true,
      status: true,
      groupId: true,
      memberId: true,
      group: { select: { deletedAt: true } },
    },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.EnrollmentRequestSelect;

type RequestRow = Prisma.EnrollmentRequestGetPayload<{ select: typeof requestSelect }>;

const toRequestResponse = (request: RequestRow): EnrollmentRequestResponse => ({
  id: toApiId(request.id),
  parentName: request.parentName,
  parentSurname: request.parentSurname,
  parentPhone: request.parentPhone,
  parentEmail: request.parentEmail,
  rawText: request.rawText,
  createdAt: request.createdAt.toISOString(),
  children: request.children.map((child) => ({
    id: toApiId(child.id),
    name: child.name,
    age: child.age.toNumber(),
    status: child.status,
    // An archived group cannot take the child any more, so it counts as none.
    groupId: child.groupId === null || child.group?.deletedAt ? null : toApiId(child.groupId),
    memberId: child.memberId === null ? null : toApiId(child.memberId),
  })),
});

// The parent's contact, to recognise the same family in another request.
type Contact = { email: string | null; phone: string | null };

// Phone numbers are compared by their digits; very short ones never match.
const phoneDigits = (phone: string | null): string | null => {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 6 ? digits : null;
};

const sameContact = (a: Contact, b: Contact): boolean => {
  const sameEmail = a.email !== null && b.email !== null && a.email.toLowerCase() === b.email.toLowerCase();
  const phone = phoneDigits(a.phone);
  return sameEmail || (phone !== null && phone === phoneDigits(b.phone));
};

const sameName = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

const requestNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Enrollment request not found");
const childNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Child not found");
const groupNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Group not found");
const notPending = (): AppError => new AppError("CONFLICT", 409, "The child was already accepted or rejected");

const requireRequestId = (requestId: string): number => requireDbId(requestId, "Enrollment request not found");
const requireChildId = (childId: string): number => requireDbId(childId, "Child not found");

const getRequest = async (db: Db | Tx, id: number): Promise<EnrollmentRequestResponse> =>
  toRequestResponse(await db.enrollmentRequest.findUniqueOrThrow({ where: { id }, select: requestSelect }));

const withChild = (status: EnrollmentChildStatus) =>
  ({ children: { some: { status } } }) satisfies Prisma.EnrollmentRequestWhereInput;

// A request with an accepted and a rejected child is both closed and rejected.
const stateWhere: Record<EnrollmentRequestState, Prisma.EnrollmentRequestWhereInput> = {
  open: withChild("pending"),
  closed: { NOT: withChild("pending"), ...withChild("accepted") },
  rejected: withChild("rejected"),
};

export const listEnrollmentRequests = async (
  db: Db,
  query: ListEnrollmentRequestsQuery,
): Promise<ListEnrollmentRequestsResponse> => {
  const where = stateWhere[query.state];
  const [total, requests] = await db.$transaction([
    db.enrollmentRequest.count({ where }),
    db.enrollmentRequest.findMany({
      where,
      select: requestSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: requests.map(toRequestResponse),
    page: query.page,
    pageSize: query.pageSize,
    total,
    waitingByGroup: Object.fromEntries(
      [...(await pendingByGroup(db))].map(([groupId, count]) => [toApiId(groupId), count]),
    ),
  };
};

// Waiting children recommended to each active group, by group id.
const pendingByGroup = async (db: Db | Tx): Promise<Map<number, number>> => {
  const rows = await db.enrollmentChild.groupBy({
    by: ["groupId"],
    where: { status: "pending", group: { deletedAt: null } },
    _count: { _all: true },
  });
  return new Map(rows.flatMap((row) => (row.groupId === null ? [] : [[row.groupId, row._count._all] as const])));
};

// Active groups with their members and the pending children already sent to them.
const loadCapacities = async (tx: Tx): Promise<GroupCapacity<number>[]> => {
  const [groups, pending] = await Promise.all([
    tx.group.findMany({
      where: { deletedAt: null },
      select: { id: true, ageFrom: true, ageTo: true, maxMembers: true, _count: { select: { members: true } } },
      orderBy: { id: "asc" },
    }),
    pendingByGroup(tx),
  ]);
  return groups.map((group) => ({
    id: group.id,
    ageFrom: group.ageFrom,
    ageTo: group.ageTo,
    maxMembers: group.maxMembers,
    members: group._count.members,
    pending: pending.get(group.id) ?? 0,
  }));
};

// Each child gets the best group for their age. Children are placed one
// after another, so a sibling placed first counts toward the next one's spots.
const recommendForChildren = (
  children: readonly { age: number }[],
  capacities: readonly GroupCapacity<number>[],
): (number | null)[] => {
  const pending = new Map(capacities.map((group) => [group.id, group.pending]));
  return children.map((child) => {
    const current = capacities.map((group) => ({ ...group, pending: pending.get(group.id) ?? 0 }));
    const best = recommendGroups(child.age, current)[0];
    if (best === undefined) {
      return null;
    }
    pending.set(best.groupId, (pending.get(best.groupId) ?? 0) + 1);
    return best.groupId;
  });
};

// The same email saved twice, or a parent writing again before the first
// request was handled: an open request from the same contact already has a
// waiting child with one of these names.
const requireNoOpenDuplicate = async (tx: Tx, body: CreateEnrollmentRequestBody): Promise<void> => {
  const contact = { email: body.parentEmail ?? null, phone: body.parentPhone ?? null };
  if (contact.email === null && phoneDigits(contact.phone) === null) {
    return;
  }
  const open = await tx.enrollmentRequest.findMany({
    where: withChild("pending"),
    select: { parentEmail: true, parentPhone: true, children: { where: { status: "pending" }, select: { name: true } } },
  });
  const duplicate = open.some(
    (request) =>
      sameContact({ email: request.parentEmail, phone: request.parentPhone }, contact) &&
      request.children.some((waiting) => body.children.some((child) => sameName(child.name, waiting.name))),
  );
  if (duplicate) {
    throw new AppError("CONFLICT", 409, "An open request for this child already exists");
  }
};

export const createEnrollmentRequest = async (
  db: Db,
  actor: Actor,
  body: CreateEnrollmentRequestBody,
): Promise<EnrollmentRequestResponse> =>
  db.$transaction(async (tx) => {
    await requireNoOpenDuplicate(tx, body);
    const groupIds = recommendForChildren(body.children, await loadCapacities(tx));
    const request = await tx.enrollmentRequest.create({
      data: {
        parentName: body.parentName,
        parentSurname: body.parentSurname ?? null,
        parentPhone: body.parentPhone ?? null,
        parentEmail: body.parentEmail ?? null,
        rawText: body.rawText ?? null,
        children: {
          create: body.children.map((child, index) => ({
            name: child.name,
            age: child.age,
            groupId: groupIds[index] ?? null,
          })),
        },
      },
      select: requestSelect,
    });
    await recordEvent(tx, actor, { action: "enrollment_request_created", enrollmentRequestId: request.id });
    return toRequestResponse(request);
  });

const requireActiveGroup = async (tx: Tx, groupId: string): Promise<number> => {
  const id = requireDbId(groupId, "Group not found");
  if (!(await tx.group.findUnique({ where: { id, deletedAt: null }, select: { id: true } }))) {
    throw groupNotFound();
  }
  return id;
};

// Why a conditional update of a child changed nothing: NOT_FOUND for a child
// that is not in the request, otherwise the given error about its status.
const missingChildError = async (tx: Tx, requestId: number, childId: number, wrongStatus: AppError) => {
  if (await tx.enrollmentChild.findFirst({ where: { id: childId, requestId }, select: { id: true } })) {
    return wrongStatus;
  }
  const request = await tx.enrollmentRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  return request ? childNotFound() : requestNotFound();
};

// Throws NOT_FOUND for a child that is not in the request and CONFLICT for one
// that is no longer pending.
const requirePendingChild = async (
  tx: Tx,
  requestId: number,
  childId: number,
): Promise<{ name: string; age: number }> => {
  const child = await tx.enrollmentChild.findFirst({
    where: { id: childId, requestId, status: "pending" },
    select: { name: true, age: true },
  });
  if (!child) {
    throw await missingChildError(tx, requestId, childId, notPending());
  }
  return { name: child.name, age: child.age.toNumber() };
};

export const setEnrollmentChildGroup = async (
  db: Db,
  actor: Actor,
  requestId: string,
  childId: string,
  groupId: string | null,
): Promise<EnrollmentRequestResponse> => {
  const requestDbId = requireRequestId(requestId);
  const childDbId = requireChildId(childId);
  return db.$transaction(async (tx) => {
    const groupDbId = groupId === null ? null : await requireActiveGroup(tx, groupId);
    // Only a pending child is changed, so a child accepted meanwhile keeps its group.
    const { count } = await tx.enrollmentChild.updateMany({
      where: { id: childDbId, requestId: requestDbId, status: "pending" },
      data: { groupId: groupDbId },
    });
    if (count === 0) {
      throw await missingChildError(tx, requestDbId, childDbId, notPending());
    }
    await recordEvent(tx, actor, {
      action: "enrollment_child_group_set",
      enrollmentRequestId: requestDbId,
      enrollmentChildId: childDbId,
      ...(groupDbId === null ? {} : { groupId: groupDbId }),
    });
    return getRequest(tx, requestDbId);
  });
};

// A guardian already in the club with the parent's email or phone.
const existingGuardian = async (tx: Tx, contact: Contact): Promise<number | undefined> => {
  if (contact.email !== null) {
    const byEmail = await tx.guardian.findFirst({
      where: { email: { equals: contact.email, mode: "insensitive" } },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (byEmail) {
      return byEmail.id;
    }
  }
  const digits = phoneDigits(contact.phone);
  if (digits === null) {
    return undefined;
  }
  // Phones are stored as typed, so they are compared by digits here. A club has few guardians.
  const withPhone = await tx.guardian.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
    orderBy: { id: "asc" },
  });
  return withPhone.find((guardian) => phoneDigits(guardian.phone) === digits)?.id;
};

// The parent as a guardian: the one a sibling already got, else one already in
// the club with the same email or phone, else a new one.
const requestGuardian = async (tx: Tx, requestId: number): Promise<number> => {
  // Writing the request first locks its row until the transaction ends, so
  // two siblings accepted at once wait for each other and share one guardian.
  const request = await tx.enrollmentRequest.update({
    where: { id: requestId },
    data: { updatedAt: new Date() },
    select: { guardianId: true, parentName: true, parentSurname: true, parentPhone: true, parentEmail: true },
  });
  if (request.guardianId !== null) {
    return request.guardianId;
  }
  const existing = await existingGuardian(tx, { email: request.parentEmail, phone: request.parentPhone });
  if (existing !== undefined) {
    await tx.enrollmentRequest.update({ where: { id: requestId }, data: { guardianId: existing } });
    return existing;
  }
  const guardian = await tx.guardian.create({
    data: {
      name: request.parentName,
      surname: request.parentSurname,
      email: request.parentEmail,
      phone: request.parentPhone,
    },
    select: { id: true },
  });
  await tx.enrollmentRequest.update({ where: { id: requestId }, data: { guardianId: guardian.id } });
  return guardian.id;
};

// The child is already an active member: one with the same name and surname
// came from a request with the same contact, or has a guardian with it.
const requireNotMemberYet = async (tx: Tx, contact: Contact, name: string, surname: string): Promise<void> => {
  const sameNameMember = {
    deletedAt: null,
    name: { equals: name, mode: "insensitive" },
    surname: { equals: surname, mode: "insensitive" },
  } satisfies Prisma.MemberWhereInput;
  const [fromRequests, withGuardians] = await Promise.all([
    tx.enrollmentChild.findMany({
      where: { status: "accepted", member: sameNameMember },
      select: { request: { select: { parentEmail: true, parentPhone: true } } },
    }),
    tx.member.findMany({
      where: sameNameMember,
      select: { guardians: { select: { guardian: { select: { email: true, phone: true } } } } },
    }),
  ]);
  const contacts: Contact[] = [
    ...fromRequests.map(({ request }) => ({ email: request.parentEmail, phone: request.parentPhone })),
    ...withGuardians.flatMap((member) => member.guardians.map(({ guardian }) => guardian)),
  ];
  if (contacts.some((other) => sameContact(other, contact))) {
    throw new AppError("CONFLICT", 409, "This child is already a member");
  }
};

// Adults join as members on their own; children as children with the parent
// as guardian. Ages count in whole years.
const roleForAge = (age: number): MemberRole => (Math.floor(age) >= ADULT_AGE ? "member" : DEFAULT_MEMBER_ROLE);

// Makes the child a member and adds them to the group, all or nothing. A
// child under 18 gets the parent as guardian. today is YYYY-MM-DD at the gym.
export const acceptEnrollmentChild = async (
  db: Db,
  actor: Actor,
  requestId: string,
  childId: string,
  body: AcceptEnrollmentChildBody,
  today: string,
): Promise<EnrollmentRequestResponse> => {
  const requestDbId = requireRequestId(requestId);
  const childDbId = requireChildId(childId);
  const orgId = requireDbId(body.orgId, "Org not found");
  return db.$transaction(async (tx) => {
    const child = await requirePendingChild(tx, requestDbId, childDbId);
    const groupId = await requireActiveGroup(tx, body.groupId);
    if (!(await tx.org.findUnique({ where: { id: orgId }, select: { id: true } }))) {
      throw new AppError("NOT_FOUND", 404, "Org not found");
    }
    const request = await tx.enrollmentRequest.findUniqueOrThrow({
      where: { id: requestDbId },
      select: { parentEmail: true, parentPhone: true },
    });
    await requireNotMemberYet(tx, { email: request.parentEmail, phone: request.parentPhone }, child.name, body.surname);
    const role = roleForAge(child.age);
    const guardianId = role === "member" ? null : await requestGuardian(tx, requestDbId);

    // Only a pending child is updated, so a second accept of the same child
    // in a parallel request finds nothing to change.
    const { count } = await tx.enrollmentChild.updateMany({
      where: { id: childDbId, status: "pending" },
      data: { status: "accepted", groupId },
    });
    if (count === 0) {
      throw notPending();
    }
    const member = await tx.member.create({
      data: { orgId, name: child.name, surname: body.surname, role, isNew: true },
      select: { id: true },
    });
    if (guardianId !== null) {
      await tx.memberGuardian.create({ data: { memberId: member.id, guardianId } });
    }
    await tx.enrollmentChild.update({ where: { id: childDbId }, data: { memberId: member.id } });
    await joinGroup(tx, groupId, member.id, today);

    await recordEvent(tx, actor, { action: "member_created", memberId: member.id });
    await recordEvent(tx, actor, { action: "group_member_added", groupId, memberId: member.id });
    await recordEvent(tx, actor, {
      action: "enrollment_child_accepted",
      enrollmentRequestId: requestDbId,
      enrollmentChildId: childDbId,
      groupId,
      memberId: member.id,
    });
    return getRequest(tx, requestDbId);
  });
};

export const rejectEnrollmentChild = async (
  db: Db,
  actor: Actor,
  requestId: string,
  childId: string,
): Promise<EnrollmentRequestResponse> => {
  const requestDbId = requireRequestId(requestId);
  const childDbId = requireChildId(childId);
  return db.$transaction(async (tx) => {
    const { count } = await tx.enrollmentChild.updateMany({
      where: { id: childDbId, requestId: requestDbId, status: "pending" },
      data: { status: "rejected" },
    });
    if (count === 0) {
      throw await missingChildError(tx, requestDbId, childDbId, notPending());
    }
    await recordEvent(tx, actor, {
      action: "enrollment_child_rejected",
      enrollmentRequestId: requestDbId,
      enrollmentChildId: childDbId,
    });
    return getRequest(tx, requestDbId);
  });
};

// Puts a rejected child back to waiting, with the group it had.
export const reopenEnrollmentChild = async (
  db: Db,
  actor: Actor,
  requestId: string,
  childId: string,
): Promise<EnrollmentRequestResponse> => {
  const requestDbId = requireRequestId(requestId);
  const childDbId = requireChildId(childId);
  return db.$transaction(async (tx) => {
    const { count } = await tx.enrollmentChild.updateMany({
      where: { id: childDbId, requestId: requestDbId, status: "rejected" },
      data: { status: "pending" },
    });
    if (count === 0) {
      throw await missingChildError(
        tx,
        requestDbId,
        childDbId,
        new AppError("CONFLICT", 409, "Only a rejected child can be put back to waiting"),
      );
    }
    await recordEvent(tx, actor, {
      action: "enrollment_child_reopened",
      enrollmentRequestId: requestDbId,
      enrollmentChildId: childDbId,
    });
    return getRequest(tx, requestDbId);
  });
};

// Removes the request and its children for good: they hold personal data.
// Members created from it stay.
export const deleteEnrollmentRequest = async (db: Db, actor: Actor, requestId: string): Promise<void> => {
  const id = requireRequestId(requestId);
  await db.$transaction(async (tx) => {
    const { count } = await tx.enrollmentRequest.deleteMany({ where: { id } });
    if (count === 0) {
      throw requestNotFound();
    }
    // The request is gone, so the event cannot point at it.
    await recordEvent(tx, actor, { action: "enrollment_request_deleted" });
  });
};
