import {
  formatCalendarDate as formatCalendarDateIn,
  formatDateTime as formatDateTimeIn,
  formatMonth as formatMonthIn,
  formatShortMonth as formatShortMonthIn,
  formatMoney as formatMoneyIn,
  formatSessionDate as formatSessionDateIn,
  formatTimeOfDay as formatTimeOfDayIn,
} from "@repo/shared/client";
import { currentLanguage } from "./i18n";

export { formatPersonName, formatSortedName } from "@repo/shared/client";

export const formatCalendarDate = (isoDate: string): string => formatCalendarDateIn(isoDate, currentLanguage());

export const formatDateTime = (isoDateTime: string): string => formatDateTimeIn(isoDateTime, currentLanguage());

export const formatTimeOfDay = (time: string): string => formatTimeOfDayIn(time, currentLanguage());

export const formatSessionDate = (isoDate: string): string => formatSessionDateIn(isoDate, currentLanguage());

export const formatMonth = (month: string): string => formatMonthIn(month, currentLanguage());

export const formatShortMonth = (month: string): string => formatShortMonthIn(month, currentLanguage());

export const formatMoney = (cents: number): string => formatMoneyIn(cents, currentLanguage());

export const formatNumber = (value: number): string => new Intl.NumberFormat(currentLanguage()).format(value);

// A share from 0 to 1, as a whole percentage.
export const formatPercent = (share: number): string =>
  new Intl.NumberFormat(currentLanguage(), { style: "percent", maximumFractionDigits: 0 }).format(share);
