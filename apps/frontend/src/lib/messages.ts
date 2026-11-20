import type { AuditAction, EnrollmentChildStatus, EnrollmentRequestState, ImportRowProblem, ImportRowStatus, MemberRole, Weekday } from "@repo/shared";
import type { ParseProblem } from "@repo/enrollment";
import type {
  AcceptEnrollmentFieldError,
  ClientErrorCode,
  EnrollmentFieldError,
  GroupAgeRangeKind,
  GroupFieldError,
  ImportField,
  ImportFileError,
  MemberFieldError,
  MonthCommentError,
  SubscriptionFieldError,
} from "@repo/shared/client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n, type Language } from "./i18n";
import type { en } from "./locales/en";

// All user-facing text lives in locales/, one file per language, referenced by key.
export type MessageKey = keyof typeof en;
export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

// For code outside components, such as helpers called while a component
// renders, and tests. Components use useMessages(), which re-renders them when
// the language changes.
export const translate: Translate = (key, params = {}) => i18n.t(key, params);

// Text in a fixed language, whatever the app is shown in, e.g. for an email to a parent.
export const translateIn =
  (language: Language): Translate =>
  (key, params = {}) =>
    i18n.t(key, { ...params, lng: language });

export const useMessages = () => {
  const { t: translateIn } = useTranslation();
  return useMemo(() => {
    const t: Translate = (key, params = {}) => translateIn(key, params);
    const errorMessage = (code: ClientErrorCode): string => t(`error.${code}`);
    return { t, errorMessage };
  }, [translateIn]);
};

export const memberFieldErrorKey = (code: MemberFieldError): MessageKey => `memberForm.error.${code}` as const;

export const importColumnKey = (field: ImportField): MessageKey => `membersImport.column.${field}` as const;

export const importFieldErrorKey = (field: ImportField): MessageKey => `membersImport.fieldError.${field}` as const;

export const importFileErrorKey = (error: ImportFileError): MessageKey => `membersImport.fileError.${error}` as const;

export const importProblemKey = (problem: ImportRowProblem): MessageKey => `membersImport.problem.${problem}` as const;

export const importStatusKey = (status: ImportRowStatus): MessageKey => `membersImport.status.${status}` as const;

export const groupFieldErrorKey = (code: GroupFieldError): MessageKey => `groupForm.error.${code}` as const;

export const subscriptionFieldErrorKey = (code: SubscriptionFieldError): MessageKey =>
  `subscriptionForm.error.${code}` as const;

export const monthCommentErrorKey = (code: MonthCommentError): MessageKey => `attendance.commentError.${code}` as const;

export const groupAgeKey = (kind: GroupAgeRangeKind): MessageKey => `groups.age.${kind}` as const;

export const weekdayKey = (day: Weekday): MessageKey => `weekday.${day}` as const;

export const auditActionKey = (action: AuditAction): MessageKey => `activity.action.${action}` as const;

export const roleKey = (role: MemberRole): MessageKey => `activity.role.${role}` as const;

const isMessageKey = (key: string): key is MessageKey => i18n.exists(key, { lng: "en" });

// The label of a changed field in the activity log, or undefined for a field
// this version of the app does not know yet.
export const auditFieldKey = (field: string): MessageKey | undefined => {
  const key = `activity.field.${field}`;
  return isMessageKey(key) ? key : undefined;
};

export const enrollmentFieldErrorKey = (code: EnrollmentFieldError): MessageKey => `enrollmentForm.error.${code}` as const;

// A missing field is named; the other problems are about the children.
export const enrollmentProblemKey = (problem: ParseProblem): MessageKey =>
  problem.code === "missing" ? (`enrollmentForm.problem.missing.${problem.field}` as const) : `enrollmentForm.problem.${problem.code}`;

export const enrollmentStatusKey = (status: EnrollmentChildStatus): MessageKey => `enrollments.status.${status}` as const;

export const acceptFieldErrorKey = (code: AcceptEnrollmentFieldError): MessageKey => `acceptForm.error.${code}` as const;

export const enrollmentStateKey = (state: EnrollmentRequestState): MessageKey => `enrollments.${state}` as const;

export const enrollmentEmptyKey = (state: EnrollmentRequestState): MessageKey => `enrollments.empty.${state}` as const;
