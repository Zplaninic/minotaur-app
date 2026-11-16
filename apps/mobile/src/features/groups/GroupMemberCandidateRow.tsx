import type { MemberResponse } from "@repo/shared";
import { Pressable, StyleSheet, Text } from "react-native";
import { formatPersonName, formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import {
  bodyLineHeight,
  colors,
  fonts,
  fontSizes,
  minTouchSize,
  opacity,
  radii,
  shadows,
  spacing,
} from "../../theme/tokens";

type GroupMemberCandidateRowProps = {
  member: Pick<MemberResponse, "name" | "surname">;
  onAdd: () => void;
  disabled: boolean;
  // Defaults to "Add {name} to the group".
  accessibilityLabel?: string;
};

export const GroupMemberCandidateRow = ({ member, onAdd, disabled, accessibilityLabel }: GroupMemberCandidateRowProps) => {
  const { t } = useMessages();
  return (
    <Pressable
      onPress={onAdd}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t("groupMemberForm.addLabel", { name: formatPersonName(member) })}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}
    >
      <Text style={styles.name}>{formatSortedName(member)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radii.lg,
    ...shadows.raised,
    backgroundColor: colors.beige10,
  },
  rowPressed: {
    backgroundColor: colors.greenLight20,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  name: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
