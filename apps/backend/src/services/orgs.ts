import type { ListOrgsResponse } from "@repo/shared";
import type { Db } from "../db/client.js";
import { toApiId } from "./ids.js";

export const listOrgs = async (db: Db): Promise<ListOrgsResponse> => {
  const orgs = await db.org.findMany({
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return { items: orgs.map((org) => ({ id: toApiId(org.id), name: org.name })) };
};
