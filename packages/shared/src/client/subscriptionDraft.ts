import { subscriptionBody, type SubscriptionBody, type SubscriptionResponse } from "../types/subscription.js";

// Form state for the add and edit subscription forms. sessionsPerWeek is "1"
// to "7", or "" when not chosen yet; price is euros as the user typed them.
export type SubscriptionDraft = {
  name: string;
  sessionsPerWeek: string;
  price: string;
};

// Apps turn these codes into their own messages.
export type SubscriptionFieldError = "name" | "sessionsPerWeek" | "price" | "invalid";

// Keyed by field: "name", "sessionsPerWeek", "price".
export type SubscriptionFieldErrors = Partial<Record<string, SubscriptionFieldError>>;

export type SubscriptionDraftValidation =
  | { ok: true; body: SubscriptionBody }
  | { ok: false; errors: SubscriptionFieldErrors };

export const emptySubscriptionDraft: SubscriptionDraft = { name: "", sessionsPerWeek: "", price: "" };

// Whole euros with up to two decimals, with a comma or a dot: "45", "45,5", "45.50".
const euroInput = /^(\d{1,6})(?:[.,](\d{1,2}))?$/;

// Euros as typed into cents, or undefined when the text is not an amount.
export const parseEuros = (input: string): number | undefined => {
  const match = euroInput.exec(input.trim());
  if (!match) {
    return undefined;
  }
  const [, euros = "0", cents = ""] = match;
  return Number(euros) * 100 + Number(cents.padEnd(2, "0"));
};

// Cents as form text: "45" for whole euros, "45.50" otherwise.
export const centsToEuroInput = (cents: number): string => {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(euros) : `${euros}.${String(rest).padStart(2, "0")}`;
};

export const subscriptionToDraft = (subscription: SubscriptionResponse): SubscriptionDraft => ({
  name: subscription.name,
  sessionsPerWeek: String(subscription.sessionsPerWeek),
  price: centsToEuroInput(subscription.price),
});

const fieldErrors: Partial<Record<string, SubscriptionFieldError>> = {
  name: "name",
  sessionsPerWeek: "sessionsPerWeek",
  price: "price",
};

export const validateSubscriptionDraft = (draft: SubscriptionDraft): SubscriptionDraftValidation => {
  const result = subscriptionBody.safeParse({
    name: draft.name,
    // Number("") is 0 and fails the 1–7 rule, like a missing choice should.
    sessionsPerWeek: Number(draft.sessionsPerWeek),
    price: parseEuros(draft.price),
  });
  if (result.success) {
    return { ok: true, body: result.data };
  }

  const errors: SubscriptionFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    errors[field] ??= fieldErrors[field] ?? "invalid";
  }
  return { ok: false, errors };
};
