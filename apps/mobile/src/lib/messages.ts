import type { Weekday } from "@repo/shared";
import type { ClientErrorCode, GroupFieldError, MemberFieldError } from "@repo/shared/client";

export const locale = "en";

// All user-facing text. English is the default language.
// {name} placeholders are filled in by t().
const messages = {
  "app.name": "Minotaur",
  "app.clubName": "Minotaur sports climbing club",
  "notFound.title": "Page not found",
  "notFound.home": "Back to the start screen",

  "home.members": "Members",
  "home.groups": "Groups",
  "home.loggedInAs": "Logged in as {name}",
  "home.logout": "Log out",

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
  "auth.offlineTitle": "No connection",
  "auth.noAccess": "Your role does not give you access to this screen.",

  "common.empty": "–",
  "common.retry": "Try again",
  "common.cancel": "Cancel",
  "common.optional": "optional",
  "common.change": "Change",
  "common.done": "Done",

  "members.title": "Members",
  "members.add": "Add member",
  "members.loading": "Loading members…",
  "members.loadingMore": "Loading more members…",
  "members.empty": "No members yet. Add the first one.",
  "members.offlineTitle": "No connection",
  "members.birthday": "Born {date}",
  "members.guardians": "Guardians: {names}",

  "memberForm.title": "Add member",
  "memberForm.member": "Member",
  "memberForm.org": "Club",
  "memberForm.orgsLoading": "Loading clubs…",
  "memberForm.orgsEmpty": "There is no club yet, so no member can be added.",
  "memberForm.name": "Name",
  "memberForm.surname": "Surname",
  "memberForm.birthday": "Birthday",
  "memberForm.birthdayPlaceholder": "Choose a date",
  "memberForm.taxNumber": "Tax number (OIB)",
  "memberForm.email": "Email",
  "memberForm.phone": "Phone",
  "memberForm.guardians": "Guardians",
  "memberForm.guardiansHint": "Required for members under {age}.",
  "memberForm.guardianNumber": "Guardian {number}",
  "memberForm.guardianKind": "Guardian {number} type",
  "memberForm.guardianNew": "New guardian",
  "memberForm.guardianExisting": "Existing guardian",
  "memberForm.guardianSearch": "Search guardians",
  "memberForm.guardianSearchHint": "Type a name or surname.",
  "memberForm.guardianNoMatch": "No guardian matches. Add a new one instead.",
  "memberForm.guardiansLoading": "Loading guardians…",
  "memberForm.guardiansEmpty": "There are no guardians yet. Add a new one instead.",
  "memberForm.guardianChosen": "Chosen: {name}",
  "memberForm.guardianAdd": "Add guardian",
  "memberForm.guardianRemove": "Remove guardian {number}",
  "memberForm.submit": "Save member",
  "memberForm.submitting": "Saving…",

  "memberForm.error.org": "Choose a club.",
  "memberForm.error.name": "Enter a name.",
  "memberForm.error.surname": "Enter a surname.",
  "memberForm.error.birthday": "Choose a birthday.",
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
  "groups.loading": "Loading groups…",
  "groups.empty": "No groups yet.",
  "groups.offlineTitle": "No connection",
  "groups.name": "{trainer} - {days} - {from} - {to}",
  "groups.memberCount": "Members: {count}",
  "groups.open": "Open group {name}",

  "group.title": "Group",
  "group.loading": "Loading the group…",
  "group.offlineTitle": "No connection",

  "group.attendance": "Attendance",

  "attendance.title": "Attendance",
  "attendance.loading": "Loading attendance…",
  "attendance.offlineTitle": "No connection",
  "attendance.previousSession": "Previous session",
  "attendance.nextSession": "Next session",
  "attendance.noSessions": "No sessions in {month} yet.",
  "attendance.createSessions": "Create sessions from {days}",
  "attendance.creatingSessions": "Creating sessions…",
  "attendance.createOnlyNearMonths": "Sessions can be created only for the current or next month.",
  "attendance.noMembers": "No members on this month's list yet.",
  "attendance.futureHint": "Future sessions can be ticked on the day.",
  "attendance.count": "{count} of {total} attended",
  "attendance.addMember": "Add member to this month",

  "monthMemberForm.title": "Add member to this month",
  "monthMemberForm.hint": "Tap a member to add them to {month}.",
  "monthMemberForm.membersLoading": "Loading members…",
  "monthMemberForm.membersEmpty": "Every member of the group is already on this month's list.",
  "monthMemberForm.offlineTitle": "No connection",
  "monthMemberForm.addLabel": "Add {name} to {month}",

  "groupMembers.title": "Members",
  "groupMembers.add": "Add member",
  "groupMembers.empty": "No members in this group yet.",
  "groupMembers.remove": "Remove",
  "groupMembers.removeLabel": "Remove {name} from the group",

  "groupMemberForm.title": "Add member to the group",
  "groupMemberForm.hint": "Tap a member to add them to the group.",
  "groupMemberForm.membersLoading": "Loading members…",
  "groupMemberForm.membersEmpty": "There is no member left to add to this group.",
  "groupMemberForm.offlineTitle": "No connection",
  "groupMemberForm.addLabel": "Add {name} to the group",

  "groupForm.title": "Add group",
  "groupForm.owner": "Trainer",
  "groupForm.trainersLoading": "Loading trainers…",
  "groupForm.trainersEmpty": "There is no trainer yet, so no group can be added.",
  "groupForm.days": "Days",
  "groupForm.from": "From",
  "groupForm.to": "To",
  "groupForm.timePlaceholder": "Choose a time",
  "groupForm.submit": "Save group",
  "groupForm.submitting": "Saving…",

  "groupForm.error.owner": "Choose a trainer.",
  "groupForm.error.days": "Choose at least one day.",
  "groupForm.error.from": "Choose a start time.",
  "groupForm.error.to": "Choose an end time.",
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
