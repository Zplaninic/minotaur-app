import { errorResponse } from "@repo/shared";

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

// The error statuses a route can answer, each with the shared errorResponse.
export const errorResponses = <S extends ErrorStatus>(...statuses: S[]): Record<S, typeof errorResponse> =>
  Object.fromEntries(statuses.map((status) => [status, errorResponse])) as Record<S, typeof errorResponse>;

// Routes behind requireAbility or requireSession can always answer 401, 403 and 500.
export const guardedErrorResponses = <S extends ErrorStatus>(
  ...statuses: S[]
): Record<S | 401 | 403 | 500, typeof errorResponse> => errorResponses<S | 401 | 403 | 500>(401, 403, 500, ...statuses);
