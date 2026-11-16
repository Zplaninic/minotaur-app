import type { GroupMemberResponse } from "@repo/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { formatPersonName, formatSortedName } from "../../lib/format";
import { t } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../../theme/tokens";

type GroupMemberRowProps = {
  member: GroupMemberResponse;
  // Without it the row has no remove button.
  onRemove?: (() => void) | undefined;
  disabled?: boolean;
};

export const GroupMemberRow = ({ member, onRemove, disabled = false }: GroupMemberRowProps) => (
  <View style={styles.row}>
    <Text style={styles.name}>{formatSortedName(member)}</Text>
    {onRemove ? (
      <Button
        label={t("groupMembers.remove")}
        accessibilityLabel={t("groupMembers.removeLabel", { name: formatPersonName(member) })}
        variant="secondary"
        onPress={onRemove}
        disabled={disabled}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
    backgroundColor: colors.beige10,
  },
  name: {
    flexShrink: 1,
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
