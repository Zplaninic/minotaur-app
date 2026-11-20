import type { GuardianResponse, ListGuardiansResponse } from "@repo/shared";
import type { Db } from "../db/client.js";
import { toApiId } from "./ids.js";

export const guardianSelect = {
  id: true,
  name: true,
  surname: true,
  email: true,
  phone: true,
} as const;

type GuardianRow = {
  id: number;
  name: string;
  surname: string | null;
  email: string | null;
  phone: string | null;
};

export const toGuardianResponse = (guardian: GuardianRow): GuardianResponse => ({
  id: toApiId(guardian.id),
  name: guardian.name,
  surname: guardian.surname,
  email: guardian.email,
  phone: guardian.phone,
});

// Only guardians of at least one active member: the ones worth picking again.
export const listGuardians = async (db: Db): Promise<ListGuardiansResponse> => {
  const guardians = await db.guardian.findMany({
    where: { members: { some: { member: { deletedAt: null } } } },
    select: guardianSelect,
    orderBy: [{ name: "asc" }, { surname: "asc" }, { id: "asc" }],
  });
  return { items: guardians.map(toGuardianResponse) };
};
