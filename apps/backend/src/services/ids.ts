import { AppError } from "../errors.js";

// API ids are opaque strings; database ids are positive integers.
export const toDbId = (value: string): number | undefined => {
  if (!/^[1-9][0-9]{0,9}$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return parsed <= 2_147_483_647 ? parsed : undefined;
};

export const toApiId = (value: number): string => String(value);

// An id that cannot be a database id names nothing, so it is answered as NOT_FOUND.
export const requireDbId = (value: string, notFoundMessage: string): number => {
  const id = toDbId(value);
  if (id === undefined) {
    throw new AppError("NOT_FOUND", 404, notFoundMessage);
  }
  return id;
};
