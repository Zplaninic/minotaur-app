import { formatCalendarDate as formatCalendarDateIn } from "@repo/shared/client";
import { locale } from "./messages";

export { formatPersonName, formatSortedName } from "@repo/shared/client";

export const formatCalendarDate = (isoDate: string): string => formatCalendarDateIn(isoDate, locale);
