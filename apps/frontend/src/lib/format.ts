import { locale } from "./messages";

// Calendar dates (YYYY-MM-DD) have no time zone, so they are formatted in UTC
// to keep the day from shifting.
const calendarDate = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const formatCalendarDate = (isoDate: string): string =>
  calendarDate.format(new Date(`${isoDate}T00:00:00.000Z`));

export const formatPersonName = (person: { name: string; surname: string }): string =>
  `${person.name} ${person.surname}`;

export const formatSortedName = (person: { name: string; surname: string }): string =>
  `${person.surname} ${person.name}`;
