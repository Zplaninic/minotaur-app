import type { GroupResponse } from "@repo/shared";
import { Pressable, StyleSheet, Text } from "react-native";
import { formatNumber } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../../theme/tokens";
import { groupName } from "./groupName";

type GroupRowProps = {
  group: GroupResponse;
  onPress: () => void;
};

export const GroupRow = ({ group, onPress }: GroupRowProps) => {
  const { t } = useMessages();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("groups.open", { name: groupName(group, t) })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.name}>{groupName(group, t)}</Text>
      <Text style={styles.detail}>{t("groups.memberCount", { count: formatNumber(group.memberCount) })}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    justifyContent: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
    backgroundColor: colors.beige10,
  },
  rowPressed: {
    backgroundColor: colors.greenDark10,
  },
  name: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  detail: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
