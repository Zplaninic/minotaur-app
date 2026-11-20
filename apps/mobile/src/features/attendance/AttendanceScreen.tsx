import type { Month } from "@repo/shared";
import {
  canCreateSessionsIn,
  hasPreviousSession,
  isFutureDate,
  resolveSession,
  stepSession,
  toErrorCode,
  type SessionPick,
} from "@repo/shared/client";
import { useMutationState } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { attendanceMutationKey, useCreateMonthSessions, useGroupAttendance } from "../../api/attendance";
import { useAbility } from "../../api/auth";
import { useGroup } from "../../api/groups";
import { Button } from "../../components/Button";
import { formatMonth, formatNumber, formatSessionDate } from "../../lib/format";
import { useMessages, weekdayKey } from "../../lib/messages";
import { useManualRefresh } from "../../lib/useManualRefresh";
import { useToday } from "../../lib/useToday";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  headingLineHeight,
  minTouchSize,
  opacity,
  radii,
  spacing,
} from "../../theme/tokens";
import { AttendanceRow } from "./AttendanceRow";
import { SkeletonList } from "../../components/SkeletonList";

type AttendanceScreenProps = {
  groupId: string;
  // The moment that decides "today"; tests pass a fixed one.
  now?: Date;
};

// One session at a time: ‹ date ›, then a row per member to tick.
export const AttendanceScreen = ({ groupId, now: fixedNow }: AttendanceScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const ability = useAbility();
  const today = useToday(fixedNow);
  const [position, setPosition] = useState<{ month: Month; pick: SessionPick }>({
    // An ISO date starts with its month.
    month: today.slice(0, 7),
    pick: { kind: "latest" },
  });
  const { month } = position;
  const group = useGroup(groupId);
  const attendance = useGroupAttendance(groupId, month);
  const createSessions = useCreateMonthSessions(groupId);
  // Copied before sorting: useMutationState may return a memoized array, and Hermes has no toSorted.
  const latestTick = [
    ...useMutationState({
      filters: { mutationKey: attendanceMutationKey(groupId, month) },
      select: (mutation) => mutation.state,
    }),
  ]
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .at(-1);

  const sessions = attendance.data?.sessions ?? [];
  const session = resolveSession(sessions, position.pick, today);
  const step = (direction: -1 | 1) => setPosition(stepSession(sessions, month, session?.id, direction));
  const refetchAll = () => Promise.all([group.refetch(), attendance.refetch()]);
  const refetch = () => void refetchAll();
  const { refreshing, onRefresh } = useManualRefresh(refetchAll);
  const canCreate = ability.can("create", "Attendance");
  const addMemberButton = ability.can("update", "Attendance") ? (
    <Button
      label={t("attendance.addMember")}
      variant="secondary"
      onPress={() => router.push({ pathname: "/groups/[id]/add-month-member", params: { id: groupId, month } })}
    />
  ) : null;

  const canGoBack = hasPreviousSession(sessions, month, session?.id);
  const nav = (
    <View style={styles.nav}>
      <Pressable
        onPress={() => step(-1)}
        disabled={!canGoBack}
        accessibilityRole="button"
        accessibilityLabel={t("attendance.previousSession")}
        accessibilityState={{ disabled: !canGoBack }}
        style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed, !canGoBack && styles.arrowDisabled]}
      >
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.navLabel}>
        {session ? formatSessionDate(session.date) : formatMonth(month)}
      </Text>
      <Pressable
        onPress={() => step(1)}
        accessibilityRole="button"
        accessibilityLabel={t("attendance.nextSession")}
        style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
      >
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );

  const body = () => {
    if (group.isError || attendance.isError) {
      const code = toErrorCode(group.error ?? attendance.error);
      return (
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("attendance.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button label={t("common.retry")} variant="secondary" onPress={refetch} />
        </View>
      );
    }
    if (group.isPending || attendance.isPending) {
      return <SkeletonList label={t("attendance.loading")} />;
    }
    if (!session) {
      return (
        <View style={styles.state}>
          <Text style={styles.text}>{t("attendance.noSessions", { month: formatMonth(month) })}</Text>
          {createSessions.error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {errorMessage(toErrorCode(createSessions.error))}
            </Text>
          ) : null}
          {canCreate && !canCreateSessionsIn(month, today) ? (
            <Text style={styles.text}>{t("attendance.createOnlyNearMonths")}</Text>
          ) : null}
          {canCreate && canCreateSessionsIn(month, today) ? (
            <Button
              label={
                createSessions.isPending
                  ? t("attendance.creatingSessions")
                  : t("attendance.createSessions", {
                      days: group.data.days.map((day) => t(weekdayKey(day))).join(", "),
                    })
              }
              onPress={() => createSessions.mutate(month)}
              pending={createSessions.isPending}
            />
          ) : null}
        </View>
      );
    }

    const members = attendance.data.members;
    const future = isFutureDate(session.date, today);
    const attended = members.filter((member) => member.attendedSessionIds.includes(session.id)).length;
    return (
      <FlatList
        data={members}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <AttendanceRow
            groupId={groupId}
            month={month}
            sessionId={session.id}
            member={item}
            disabled={future || !ability.can("update", "Attendance")}
            onChangeSubscription={
              ability.can("update", "Attendance")
                ? () =>
                    router.push({
                      pathname: "/groups/[id]/member-subscription",
                      params: { id: groupId, month, memberId: item.id },
                    })
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.text}>
              {t("attendance.count", { count: formatNumber(attended), total: formatNumber(members.length) })}
            </Text>
            {future ? <Text style={styles.text}>{t("attendance.futureHint")}</Text> : null}
            {addMemberButton}
            {latestTick?.status === "error" ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {errorMessage(toErrorCode(latestTick.error))}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.state}>
            <Text style={styles.text}>{t("attendance.noMembers")}</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.content}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      {nav}
      {body()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige40,
  },
  content: {
    flexGrow: 1,
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  arrow: {
    minWidth: minTouchSize,
    minHeight: minTouchSize,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borders.width,
    borderColor: colors.greenDark,
    borderRadius: radii.pill,
    backgroundColor: colors.beige10,
  },
  arrowPressed: {
    backgroundColor: colors.greenLight30,
  },
  arrowDisabled: {
    opacity: opacity.disabled,
  },
  arrowText: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.xl,
    lineHeight: bodyLineHeight(fontSizes.xl),
  },
  navLabel: {
    flex: 1,
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
    textAlign: "center",
  },
  listHeader: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  text: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  error: {
    alignSelf: "stretch",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    overflow: "hidden",
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
