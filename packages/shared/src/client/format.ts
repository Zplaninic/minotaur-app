type Person = { name: string; surname: string };

// Calendar dates (YYYY-MM-DD) have no time zone, so they are formatted in UTC
// to keep the day from shifting.
export const formatCalendarDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00.000Z`),
  );

export const formatPersonName = (person: Person): string => `${person.name} ${person.surname}`;

export const formatSortedName = (person: Person): string => `${person.surname} ${person.name}`;
