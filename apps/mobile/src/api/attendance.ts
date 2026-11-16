import type { GroupAttendanceResponse, Month } from "@repo/shared";
import {
  addMonthMember,
  addTrainingSession,
  applyAttendanceChange,
  attendanceKeys,
  attendanceQueries,
  createMonthSessions,
  deleteTrainingSession,
  keysToInvalidateAfterAttendanceChange,
  markAttendance,
  removeMonthMember,
  setMonthPaid,
  setMonthSubscription,
  unmarkAttendance,
} from "@repo/shared/client";
import { useMutation, useQueryClient, useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Every tick and untick, for counting the ones in flight.
const ATTENDANCE_MUTATION = ["attendance"] as const;

// The ticks and unticks of one group's month, for finding its latest one.
export const attendanceMutationKey = (groupId: string, month: Month) =>
  [...ATTENDANCE_MUTATION, groupId, month] as const;

const invalidateAttendance = (queryClient: QueryClient) =>
  Promise.all(keysToInvalidateAfterAttendanceChange.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export const useGroupAttendance = (groupId: string, month: Month) =>
  useQuery(attendanceQueries.month(api, groupId, month));

export const useCreateMonthSessions = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: Month) => createMonthSessions(api, groupId, month),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

export const useAddTrainingSession = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => addTrainingSession(api, groupId, date),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

export const useDeleteTrainingSession = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteTrainingSession(api, groupId, sessionId),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

type AttendanceChange = { sessionId: string; memberId: string; attended: boolean };

// The checkbox flips at once; the server answer follows. Several boxes can be
// in flight, so the month is refetched only after the last one settles.
export const useSetAttendance = (groupId: string, month: Month) => {
  const queryClient = useQueryClient();
  const queryKey = attendanceKeys.month(groupId, month);
  return useMutation({
    mutationKey: attendanceMutationKey(groupId, month),
    mutationFn: ({ sessionId, memberId, attended }: AttendanceChange) =>
      attended
        ? markAttendance(api, groupId, sessionId, memberId)
        : unmarkAttendance(api, groupId, sessionId, memberId),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<GroupAttendanceResponse>(queryKey, (data) =>
        data ? applyAttendanceChange(data, change) : data,
      );
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: ATTENDANCE_MUTATION }) === 1) {
        await invalidateAttendance(queryClient);
      }
    },
  });
};

export const useAddMonthMember = (groupId: string, month: Month) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => addMonthMember(api, groupId, month, memberId),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

export const useRemoveMonthMember = (groupId: string, month: Month) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMonthMember(api, groupId, month, memberId),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

// null clears the member's subscription for the month.
export const useSetMonthSubscription = (groupId: string, month: Month, memberId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string | null) => setMonthSubscription(api, groupId, month, memberId, subscriptionId),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};

export const useSetMonthPaid = (groupId: string, month: Month, memberId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paid: boolean) => setMonthPaid(api, groupId, month, memberId, paid),
    onSuccess: () => invalidateAttendance(queryClient),
  });
};
