import type { AttendanceMemberResponse, Month } from "@repo/shared";
import { overdueMonthsOf } from "@repo/shared/client";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSetAttendance } from "../../api/attendance";
import { useAbility } from "../../api/auth";
import { useOverduePayments } from "../../api/subscriptions";
import { formatMonth, formatPersonName, formatShortMonth, formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  minTouchSize,
  opacity,
  radii,
  shadows,
  spacing,
} from "../../theme/tokens";

type AttendanceRowProps = {
  groupId: string;
  month: Month;
  sessionId: string;
  member: AttendanceMemberResponse;
  disabled: boolean;
  // Without it the subscription is shown but cannot be changed.
  onChangeSubscription?: (() => void) | undefined;
};

// The row is the checkbox; the subscription button sits beside it.
export const AttendanceRow = ({
  groupId,
  month,
  sessionId,
  member,
  disabled,
  onChangeSubscription,
}: AttendanceRowProps) => {
  const { t } = useMessages();
  const setAttendance = useSetAttendance(groupId, month);
  const checked = member.attendedSessionIds.includes(sessionId);
  const inactive = disabled || setAttendance.isPending;
  const canReadPayments = useAbility().can("read", "Subscription");
  const overdue = useOverduePayments();
  const unpaidMonths = canReadPayments ? overdueMonthsOf(overdue.data, member.id) : [];

  return (
    <View style={[styles.row, checked && styles.rowChecked]}>
      <Pressable
        onPress={() => setAttendance.mutate({ sessionId, memberId: member.id, attended: !checked })}
        disabled={inactive}
        accessibilityRole="checkbox"
        accessibilityLabel={formatSortedName(member)}
        accessibilityState={{ checked, disabled: inactive }}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}
      >
        <View style={[styles.box, checked && styles.boxChecked, disabled && styles.boxDisabled]} />
        <View style={styles.text}>
          <Text style={styles.name}>{formatSortedName(member)}</Text>
          <Text style={styles.subscription}>
            {t("attendance.monthStatus", {
              subscription: member.subscription?.name ?? t("attendance.noSubscription"),
              paid: member.paid ? t("attendance.paid") : t("attendance.notPaid"),
            })}
          </Text>
          {member.comment ? (
            <Text style={styles.subscription}>{t("attendance.comment", { comment: member.comment })}</Text>
          ) : null}
          {unpaidMonths.length > 0 ? (
            <Text style={styles.unpaid}>
              {t("overdue.badge", { months: unpaidMonths.map(formatShortMonth).join(", ") })}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onChangeSubscription ? (
        <Pressable
          onPress={onChangeSubscription}
          accessibilityRole="button"
          accessibilityLabel={t("attendance.changeSubscriptionLabel", {
            name: formatPersonName(member),
            month: formatMonth(month),
          })}
          style={({ pressed }) => [styles.change, pressed && styles.pressed]}
        >
          <Text style={styles.changeLabel}>{t("attendance.changeSubscription")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radii.lg,
    ...shadows.raised,
    backgroundColor: colors.beige10,
    overflow: "hidden",
  },
  rowChecked: {
    backgroundColor: colors.greenLight20,
  },
  pressed: {
    backgroundColor: colors.greenLight30,
  },
  check: {
    flex: 1,
    minHeight: minTouchSize,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  box: {
    width: spacing[6],
    height: spacing[6],
    borderRadius: spacing[1] + spacing[1] / 2,
    borderWidth: borders.width,
    borderColor: colors.greenDark,
    backgroundColor: colors.beige10,
  },
  boxChecked: {
    backgroundColor: colors.greenDark,
  },
  boxDisabled: {
    opacity: opacity.disabled,
  },
  text: {
    flexShrink: 1,
    gap: spacing[1],
  },
  name: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  subscription: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
  unpaid: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    borderWidth: borders.width,
    borderColor: colors.red50,
    borderRadius: radii.pill,
    overflow: "hidden",
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
  change: {
    minWidth: minTouchSize,
    minHeight: minTouchSize,
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    borderLeftWidth: borders.width,
    borderLeftColor: colors.greenDark20,
  },
  changeLabel: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
    textDecorationLine: "underline",
  },
});
