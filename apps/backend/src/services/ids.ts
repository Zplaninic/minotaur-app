// API ids are opaque strings; database ids are positive integers.
export const toDbId = (value: string): number | undefined => {
  if (!/^[1-9][0-9]{0,9}$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return parsed <= 2_147_483_647 ? parsed : undefined;
};

export const toApiId = (value: number): string => String(value);
