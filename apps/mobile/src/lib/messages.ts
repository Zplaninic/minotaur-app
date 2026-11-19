import type { Weekday } from "@repo/shared";
import type {
  ClientErrorCode,
  GroupAgeRangeKind,
  GroupFieldError,
  MemberFieldError,
  MonthCommentError,
  SubscriptionFieldError,
} from "@repo/shared/client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "./i18n";
import type { en } from "./locales/en";

// All user-facing text lives in locales/, one file per language, referenced by key.
export type MessageKey = keyof typeof en;
export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

// For code outside components, such as helpers called while a component
// renders, and tests. Components use useMessages(), which re-renders them when
// the language changes.
export const translate: Translate = (key, params = {}) => i18n.t(key, params);

export const useMessages = () => {
  const { t: translateIn } = useTranslation();
  return useMemo(() => {
    const t: Translate = (key, params = {}) => translateIn(key, params);
    const errorMessage = (code: ClientErrorCode): string => t(`error.${code}`);
    return { t, errorMessage };
  }, [translateIn]);
};

export const memberFieldErrorKey = (code: MemberFieldError): MessageKey => `memberForm.error.${code}` as const;

export const groupFieldErrorKey = (code: GroupFieldError): MessageKey => `groupForm.error.${code}` as const;

export const subscriptionFieldErrorKey = (code: SubscriptionFieldError): MessageKey =>
  `subscriptionForm.error.${code}` as const;

export const monthCommentErrorKey = (code: MonthCommentError): MessageKey => `monthCommentForm.error.${code}` as const;

export const groupAgeKey = (kind: GroupAgeRangeKind): MessageKey => `groups.age.${kind}` as const;

export const weekdayKey = (day: Weekday): MessageKey => `weekday.${day}` as const;
