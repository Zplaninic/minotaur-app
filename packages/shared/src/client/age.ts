// Age in whole years on the given local day, from a YYYY-MM-DD birthday.
// The backend repeats this check on its own date and has the final say.
export const ageOn = (birthday: string, today: Date): number => {
  const [year = 0, month = 0, day = 0] = birthday.split("-").map(Number);
  const age = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  const beforeBirthday = todayMonth < month || (todayMonth === month && today.getDate() < day);
  return beforeBirthday ? age - 1 : age;
};

// The local calendar day of a Date, as YYYY-MM-DD.
export const toIsoDate = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");

// A YYYY-MM-DD string as a Date at local midnight.
export const fromIsoDate = (isoDate: string): Date => {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};
