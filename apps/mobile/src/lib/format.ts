import {
  formatCalendarDate as formatCalendarDateIn,
  formatMonth as formatMonthIn,
  formatSessionDate as formatSessionDateIn,
  formatTimeOfDay as formatTimeOfDayIn,
} from "@repo/shared/client";
import { locale } from "./messages";

export { formatPersonName, formatSortedName } from "@repo/shared/client";

export const formatCalendarDate = (isoDate: string): string => formatCalendarDateIn(isoDate, locale);

export const formatTimeOfDay = (time: string): string => formatTimeOfDayIn(time, locale);

export const formatSessionDate = (isoDate: string): string => formatSessionDateIn(isoDate, locale);

export const formatMonth = (month: string): string => formatMonthIn(month, locale);

export const formatNumber = (value: number): string => new Intl.NumberFormat(locale).format(value);
