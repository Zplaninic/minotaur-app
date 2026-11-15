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
  surname: string;
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

export const listGuardians = async (db: Db): Promise<ListGuardiansResponse> => {
  const guardians = await db.guardian.findMany({
    select: guardianSelect,
    orderBy: [{ surname: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return { items: guardians.map(toGuardianResponse) };
};
