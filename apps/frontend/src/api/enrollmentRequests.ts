import type { AcceptEnrollmentChildBody, CreateEnrollmentRequestBody } from "@repo/shared";
import {
  acceptEnrollmentChild,
  createEnrollmentRequest,
  deleteEnrollmentRequest,
  enrollmentRequestQueries,
  keysToInvalidateAfterEnrollmentAccept,
  keysToInvalidateAfterEnrollmentChange,
  rejectEnrollmentChild,
  reopenEnrollmentChild,
  setEnrollmentChildGroup,
  type EnrollmentRequestsPageQuery,
} from "@repo/shared/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./client";

// Keeps the current page on screen while the next one loads.
export const useEnrollmentRequests = (query: EnrollmentRequestsPageQuery) =>
  useQuery({ ...enrollmentRequestQueries.list(api, query), placeholderData: keepPreviousData });

const useEnrollmentMutation = <Input, Result>(
  mutationFn: (input: Input) => Promise<Result>,
  keys: readonly QueryKey[],
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Also after an error: a CONFLICT means the list on screen is out of date.
    onSettled: async () => {
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
};

export const useCreateEnrollmentRequest = () =>
  useEnrollmentMutation(
    (body: CreateEnrollmentRequestBody) => createEnrollmentRequest(api, body),
    keysToInvalidateAfterEnrollmentChange,
  );

export const useSetEnrollmentChildGroup = (requestId: string, childId: string) =>
  useEnrollmentMutation(
    (groupId: string | null) => setEnrollmentChildGroup(api, requestId, childId, groupId),
    keysToInvalidateAfterEnrollmentChange,
  );

export const useAcceptEnrollmentChild = (requestId: string, childId: string) =>
  useEnrollmentMutation(
    (body: AcceptEnrollmentChildBody) => acceptEnrollmentChild(api, requestId, childId, body),
    keysToInvalidateAfterEnrollmentAccept,
  );

export const useRejectEnrollmentChild = (requestId: string, childId: string) =>
  useEnrollmentMutation(() => rejectEnrollmentChild(api, requestId, childId), keysToInvalidateAfterEnrollmentChange);

export const useReopenEnrollmentChild = (requestId: string, childId: string) =>
  useEnrollmentMutation(() => reopenEnrollmentChild(api, requestId, childId), keysToInvalidateAfterEnrollmentChange);

export const useDeleteEnrollmentRequest = (requestId: string) =>
  useEnrollmentMutation(() => deleteEnrollmentRequest(api, requestId), keysToInvalidateAfterEnrollmentChange);
