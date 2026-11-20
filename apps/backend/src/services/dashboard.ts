import { GROUP_MEMBER_ROLES, type DashboardResponse } from "@repo/shared";
import type { Db } from "../db/client.js";
import { monthOf, monthStart, toDbDate } from "./dates.js";
import { toApiId } from "./ids.js";

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// today is YYYY-MM-DD at the gym. Archived members and groups are left out.
export const getDashboard = async (db: Db, orgId: number, today: string): Promise<DashboardResponse> => {
  const month = monthOf(today);
  const rosterOfThisMonth = {
    month: monthStart(month),
    member: { deletedAt: null },
    group: { orgId, deletedAt: null },
  };

  const [activeMembers, withoutSubscription, rosterSizes, sessions] = await Promise.all([
    db.member.count({ where: { orgId, deletedAt: null, role: { in: [...GROUP_MEMBER_ROLES] } } }),
    db.groupMonthMember.findMany({
      where: { ...rosterOfThisMonth, memberMonth: { subscriptionId: null } },
      select: { groupId: true, member: { select: { id: true, name: true, surname: true } } },
      orderBy: [{ member: { name: "asc" } }, { member: { surname: "asc" } }, { memberId: "asc" }, { groupId: "asc" }],
    }),
    db.groupMonthMember.groupBy({ by: ["groupId"], where: rosterOfThisMonth, _count: { _all: true } }),
    db.trainingSession.findMany({
      where: { date: { gte: monthStart(month), lte: toDbDate(today) }, group: { orgId, deletedAt: null } },
      select: { groupId: true, _count: { select: { attendance: { where: { member: { deletedAt: null } } } } } },
    }),
  ]);

  const members: DashboardResponse["withoutSubscription"] = [];
  for (const row of withoutSubscription) {
    const memberId = toApiId(row.member.id);
    const last = members.at(-1);
    if (last?.id === memberId) {
      last.groupIds.push(toApiId(row.groupId));
    } else {
      members.push({ ...row.member, id: memberId, groupIds: [toApiId(row.groupId)] });
    }
  }

  const rosterSize = new Map(rosterSizes.map((row) => [row.groupId, row._count._all]));
  return {
    today,
    month,
    activeMembers,
    withoutSubscription: members,
    attendance: {
      expected: sum(sessions.map((session) => rosterSize.get(session.groupId) ?? 0)),
      attended: sum(sessions.map((session) => session._count.attendance)),
    },
  };
};
