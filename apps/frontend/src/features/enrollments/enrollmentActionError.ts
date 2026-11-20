import { toErrorCode, type ClientErrorCode } from "@repo/shared/client";
import type { Translate } from "../../lib/messages";

// On a child, CONFLICT means someone else already accepted or rejected them.
export const enrollmentActionError = (
  error: unknown,
  t: Translate,
  errorMessage: (code: ClientErrorCode) => string,
): string => {
  const code = toErrorCode(error);
  return code === "CONFLICT" ? t("enrollments.error.alreadyDecided") : errorMessage(code);
};
