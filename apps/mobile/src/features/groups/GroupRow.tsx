import type { GroupResponse } from "@repo/shared";
import { isGroupOverLimit } from "@repo/shared/client";
import { Pressable, StyleSheet, Text } from "react-native";
import { formatNumber } from "../../lib/format";
import { type Translate, useMessages } from "../../lib/messages";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  minTouchSize,
  radii,
  shadows,
  spacing,
} from "../../theme/tokens";
import { groupName } from "./groupName";

type GroupRowProps = {
  group: GroupResponse;
  onPress: () => void;
};

const memberCountText = (group: GroupResponse, t: Translate): string => {
  const count = formatNumber(group.memberCount);
  return group.maxMembers === null
    ? t("groups.memberCount", { count })
    : t("groups.memberCountWithLimit", { count, max: formatNumber(group.maxMembers) });
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
      <Text style={styles.detail}>{memberCountText(group, t)}</Text>
      {isGroupOverLimit(group) ? <Text style={styles.overLimit}>{t("groups.overLimit")}</Text> : null}
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
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radii.lg,
    ...shadows.raised,
    backgroundColor: colors.beige10,
  },
  rowPressed: {
    backgroundColor: colors.greenLight20,
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
  overLimit: {
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
});
