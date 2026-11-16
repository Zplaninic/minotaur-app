import {
  formatCalendarDate as formatCalendarDateIn,
  formatMonth as formatMonthIn,
  formatShortMonth as formatShortMonthIn,
  formatMoney as formatMoneyIn,
  formatSessionDate as formatSessionDateIn,
  formatTimeOfDay as formatTimeOfDayIn,
} from "@repo/shared/client";
import { currentLanguage } from "./i18n";

export { formatPersonName, formatSortedName } from "@repo/shared/client";

export const formatCalendarDate = (isoDate: string): string => formatCalendarDateIn(isoDate, currentLanguage());

export const formatTimeOfDay = (time: string): string => formatTimeOfDayIn(time, currentLanguage());

export const formatSessionDate = (isoDate: string): string => formatSessionDateIn(isoDate, currentLanguage());

export const formatMonth = (month: string): string => formatMonthIn(month, currentLanguage());

export const formatShortMonth = (month: string): string => formatShortMonthIn(month, currentLanguage());

export const formatMoney = (cents: number): string => formatMoneyIn(cents, currentLanguage());

export const formatNumber = (value: number): string => new Intl.NumberFormat(currentLanguage()).format(value);
