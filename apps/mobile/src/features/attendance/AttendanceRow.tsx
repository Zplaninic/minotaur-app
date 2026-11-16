import type { AttendanceMemberResponse, Month } from "@repo/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSetAttendance } from "../../api/attendance";
import { formatSortedName } from "../../lib/format";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, opacity, spacing } from "../../theme/tokens";

type AttendanceRowProps = {
  groupId: string;
  month: Month;
  sessionId: string;
  member: AttendanceMemberResponse;
  disabled: boolean;
};

// The whole row is the checkbox.
export const AttendanceRow = ({ groupId, month, sessionId, member, disabled }: AttendanceRowProps) => {
  const setAttendance = useSetAttendance(groupId, month);
  const checked = member.attendedSessionIds.includes(sessionId);
  const inactive = disabled || setAttendance.isPending;

  return (
    <Pressable
      onPress={() => setAttendance.mutate({ sessionId, memberId: member.id, attended: !checked })}
      disabled={inactive}
      accessibilityRole="checkbox"
      accessibilityLabel={formatSortedName(member)}
      accessibilityState={{ checked, disabled: inactive }}
      style={({ pressed }) => [styles.row, checked && styles.rowChecked, pressed && styles.rowPressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked, disabled && styles.boxDisabled]} />
      <Text style={styles.name}>{formatSortedName(member)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
    backgroundColor: colors.beige10,
  },
  rowChecked: {
    backgroundColor: colors.greenLight20,
  },
  rowPressed: {
    backgroundColor: colors.greenDark10,
  },
  box: {
    width: spacing[6],
    height: spacing[6],
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
  name: {
    flexShrink: 1,
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
