import { weekday, type Month, type Weekday } from "@repo/shared";

// Postgres `date` values travel as midnight UTC in a Date.
export const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

// Postgres `time` values travel as the time on 1970-01-01 UTC in a Date.
export const toTimeOfDay = (date: Date): string => date.toISOString().slice(11, 16);

// The calendar day in a time zone, as YYYY-MM-DD.
export const isoDateIn = (now: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now)
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
};

// The month of a YYYY-MM-DD date.
export const monthOf = (isoDate: string): Month => isoDate.slice(0, 7);

export const nextMonth = (month: Month): Month => {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
};

// A month as stored in month columns: its first day.
export const monthStart = (month: Month): Date => toDbDate(`${month}-01`);

export const monthRange = (month: Month): { gte: Date; lt: Date } => {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(year, monthNumber - 1, 1)), lt: new Date(Date.UTC(year, monthNumber, 1)) };
};

// weekday lists Monday first; getUTCDay counts from Sunday.
const weekdayOf = (date: Date): Weekday | undefined => weekday.options[(date.getUTCDay() + 6) % 7];

// Every date of the month that falls on one of the days, as YYYY-MM-DD.
export const trainingDates = (month: Month, days: readonly Weekday[]): string[] => {
  const { gte, lt } = monthRange(month);
  const dates: string[] = [];
  for (const date = new Date(gte); date < lt; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = weekdayOf(date);
    if (day && days.includes(day)) {
      dates.push(toIsoDate(date));
    }
  }
  return dates;
};
