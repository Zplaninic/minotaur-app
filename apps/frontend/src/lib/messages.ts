import type { Weekday } from "@repo/shared";
import type { ClientErrorCode, GroupFieldError, MemberFieldError } from "@repo/shared/client";

export const locale = "en";

// All user-facing text. English is the default language.
// {name} placeholders are filled in by t().
const messages = {
  "app.name": "Minotaur",
  "app.clubName": "Minotaur sports climbing club",
  "nav.label": "Main",
  "nav.members": "Members",
  "nav.groups": "Groups",
  "nav.loggedInAs": "Logged in as {name}",
  "nav.logout": "Log out",

  "login.title": "Log in",
  "login.email": "Email",
  "login.password": "Password",
  "login.showPassword": "Show password",
  "login.submit": "Log in",
  "login.submitting": "Logging in…",
  "login.error.email": "Enter a valid email address.",
  "login.error.password": "Enter your password.",
  "login.error.credentials": "Email or password is wrong.",
  "login.error.rateLimited": "Too many attempts. Wait a minute and try again.",

  "auth.checking": "Checking your login…",
  "auth.noAccess": "Your role does not give you access to this page.",
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

  "weekday.monday": "Monday",
  "weekday.tuesday": "Tuesday",
  "weekday.wednesday": "Wednesday",
  "weekday.thursday": "Thursday",
  "weekday.friday": "Friday",
  "weekday.saturday": "Saturday",
  "weekday.sunday": "Sunday",

  "groups.title": "Groups",
  "groups.add": "Add group",
  "groups.empty": "No groups yet.",
  "groups.loading": "Loading groups…",
  "groups.table.caption": "Training groups, sorted by trainer",
  "groups.name": "{trainer} - {days} - {from} - {to}",
  "groups.table.name": "Name",
  "groups.table.owner": "Trainer",
  "groups.table.days": "Days",
  "groups.table.time": "Time",
  "groups.timeRange": "{from} – {to}",

  "groupForm.title": "Add group",
  "groupForm.owner": "Trainer",
  "groupForm.ownerPlaceholder": "Choose a trainer",
  "groupForm.trainersLoading": "Loading trainers…",
  "groupForm.trainersEmpty": "There is no trainer yet, so no group can be added.",
  "groupForm.days": "Days",
  "groupForm.from": "From",
  "groupForm.to": "To",
  "groupForm.submit": "Save group",
  "groupForm.submitting": "Saving…",

  "groupForm.error.owner": "Choose a trainer.",
  "groupForm.error.days": "Choose at least one day.",
  "groupForm.error.from": "Enter a start time.",
  "groupForm.error.to": "Enter an end time.",
  "groupForm.error.timeOrder": "The end time must be after the start time.",
  "groupForm.error.invalid": "Check this field.",
} as const;

const errorMessages: Record<ClientErrorCode, string> = {
  VALIDATION_ERROR: "Some of the information is not valid. Check it and try again.",
  UNAUTHORIZED: "Your login has ended. Log in again.",
  FORBIDDEN: "You are not allowed to do this.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
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

export const groupFieldErrorKey = (code: GroupFieldError): MessageKey => `groupForm.error.${code}` as const;

export const weekdayKey = (day: Weekday): MessageKey => `weekday.${day}` as const;
