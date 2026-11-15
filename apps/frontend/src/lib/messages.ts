import type { ClientErrorCode, MemberFieldError } from "@repo/shared/client";

export const locale = "en";

// All user-facing text. English is the default language.
// {name} placeholders are filled in by t().
const messages = {
  "app.name": "Minotaur",
  "nav.label": "Main",
  "nav.members": "Members",
  "notFound.title": "Page not found",
  "notFound.home": "Back to the start page",

  "common.empty": "–",
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.optional": "optional",

  "members.title": "Members",
  "members.add": "Add member",
  "members.empty": "No members yet. Add the first one.",
  "members.loading": "Loading members…",
  "members.table.caption": "Club members, sorted by surname",
  "members.table.name": "Name",
  "members.table.birthday": "Birthday",
  "members.table.email": "Email",
  "members.table.phone": "Phone",
  "members.table.guardians": "Guardians",
  "members.pagination.label": "Members pages",
  "members.pagination.previous": "Previous",
  "members.pagination.next": "Next",
  "members.pagination.status": "Page {page} of {pages}",

  "memberForm.title": "Add member",
  "memberForm.member": "Member",
  "memberForm.org": "Club",
  "memberForm.orgPlaceholder": "Choose a club",
  "memberForm.orgsLoading": "Loading clubs…",
  "memberForm.orgsEmpty": "There is no club yet, so no member can be added.",
  "memberForm.name": "Name",
  "memberForm.surname": "Surname",
  "memberForm.birthday": "Birthday",
  "memberForm.taxNumber": "Tax number (OIB)",
  "memberForm.email": "Email",
  "memberForm.phone": "Phone",
  "memberForm.guardians": "Guardians",
  "memberForm.guardiansHint": "Required for members under {age}.",
  "memberForm.guardianNumber": "Guardian {number}",
  "memberForm.guardianNew": "New guardian",
  "memberForm.guardianExisting": "Existing guardian",
  "memberForm.guardianPick": "Guardian",
  "memberForm.guardianPlaceholder": "Choose a guardian",
  "memberForm.guardiansLoading": "Loading guardians…",
  "memberForm.guardiansEmpty": "There are no guardians yet. Add a new one instead.",
  "memberForm.guardianAdd": "Add guardian",
  "memberForm.guardianRemove": "Remove guardian {number}",
  "memberForm.submit": "Save member",
  "memberForm.submitting": "Saving…",

  "memberForm.error.org": "Choose a club.",
  "memberForm.error.name": "Enter a name.",
  "memberForm.error.surname": "Enter a surname.",
  "memberForm.error.birthday": "Enter a valid date.",
  "memberForm.error.taxNumber": "Enter the 11 digits of the tax number.",
  "memberForm.error.taxNumberTaken": "A member with this tax number already exists.",
  "memberForm.error.email": "Enter a valid email address, like name@example.com.",
  "memberForm.error.phone": "Enter a valid phone number, like +385 91 123 4567.",
  "memberForm.error.guardian": "Choose a guardian.",
  "memberForm.error.guardianDuplicate": "The same guardian is listed twice.",
  "memberForm.error.guardianRequired": "A member under {age} needs at least one guardian.",
  "memberForm.error.invalid": "Check this field.",
} as const;

const errorMessages: Record<ClientErrorCode, string> = {
  VALIDATION_ERROR: "Some of the information is not valid. Check it and try again.",
  NOT_FOUND: "We could not find what you were looking for.",
  CONFLICT: "This already exists.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again in a moment.",
  NETWORK_ERROR: "We could not reach the server. Check your connection and try again.",
  UNEXPECTED_RESPONSE: "The server sent an answer we did not understand. Try again in a moment.",
};

export type MessageKey = keyof typeof messages;
export type MessageParams = Record<string, string | number>;

export const t = (key: MessageKey, params: MessageParams = {}): string =>
  messages[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(params[name] ?? placeholder));

export const errorMessage = (code: ClientErrorCode): string => errorMessages[code];

export const memberFieldErrorKey = (code: MemberFieldError): MessageKey => `memberForm.error.${code}` as const;
