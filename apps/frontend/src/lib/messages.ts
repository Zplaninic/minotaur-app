import type { ClientErrorCode } from "../api/client";

// All user-facing text. English is the default language.
const messages = {
  "app.name": "Minotaur",
  "notFound.title": "Page not found",
  "notFound.home": "Back to the start page",
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

export const t = (key: MessageKey): string => messages[key];

export const errorMessage = (code: ClientErrorCode): string => errorMessages[code];
