import type { ClientErrorCode, MemberFieldError } from "@repo/shared/client";

export const locale = "en";

// All user-facing text. English is the default language.
// {name} placeholders are filled in by t().
const messages = {
  "app.name": "Minotaur",
  "notFound.title": "Page not found",
  "notFound.home": "Back to the start screen",

  "home.members": "Members",
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
