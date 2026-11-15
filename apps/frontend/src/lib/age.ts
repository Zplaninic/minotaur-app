// Age in whole years on the given day, from a YYYY-MM-DD birthday.
// Mirrors ageOn in the backend member service, which has the final say.
export const ageOn = (birthday: string, today: Date): number => {
  const [year = 0, month = 0, day = 0] = birthday.split("-").map(Number);
  const age = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  const beforeBirthday = todayMonth < month || (todayMonth === month && today.getDate() < day);
  return beforeBirthday ? age - 1 : age;
};
