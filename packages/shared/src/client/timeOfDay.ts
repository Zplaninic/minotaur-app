// Times of day (HH:mm) have no date or time zone. They are formatted in UTC
// so the hour never shifts.
export const formatTimeOfDay = (time: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(`1970-01-01T${time}:00.000Z`),
  );

// The local time of a Date, as HH:mm.
export const toTimeOfDay = (date: Date): string =>
  [date.getHours(), date.getMinutes()].map((part) => String(part).padStart(2, "0")).join(":");

// An HH:mm string as a Date today at that local time, for time pickers.
export const fromTimeOfDay = (time: string): Date => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
