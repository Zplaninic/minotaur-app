type Person = { name: string; surname: string | null };

// Calendar dates (YYYY-MM-DD) have no time zone, so they are formatted in UTC
// to keep the day from shifting.
export const formatCalendarDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00.000Z`),
  );

// A moment in time (ISO datetime) in the viewer's time zone, e.g. "Nov 20, 2026, 11:34".
export const formatDateTime = (isoDateTime: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoDateTime));

// Guardians may have no surname.
export const formatPersonName = (person: Person): string =>
  person.surname === null ? person.name : `${person.name} ${person.surname}`;

// A session's date for column headers and the checklist, e.g. "Mon, Nov 2".
export const formatSessionDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00.000Z`),
  );

// A YYYY-MM month, e.g. "November 2026".
export const formatMonth = (month: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00.000Z`),
  );

// A YYYY-MM month in short, e.g. "Oct 2026".
export const formatShortMonth = (month: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00.000Z`),
  );

// The club charges in euros.
export const CURRENCY = "EUR";

// A price in euro cents, e.g. "€45.50".
export const formatMoney = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY }).format(cents / 100);
