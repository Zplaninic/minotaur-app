import type { GroupMemberResponse } from "@repo/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { GuardianList } from "../../components/GuardianList";
import { NewBadge } from "../../components/NewBadge";
import { formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, minTouchSize, radii, shadows, spacing } from "../../theme/tokens";

type GroupMemberRowProps = {
  member: GroupMemberResponse;
  // Without it the row has no remove button.
  onRemove?: (() => void) | undefined;
  disabled?: boolean;
};

export const GroupMemberRow = ({ member, onRemove, disabled = false }: GroupMemberRowProps) => {
  const { t } = useMessages();
  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <Text style={styles.name}>{formatPersonName(member)}</Text>
        {member.isNew ? <NewBadge /> : null}
        <GuardianList guardians={member.guardians} />
      </View>
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
};

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
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radii.lg,
    ...shadows.raised,
    backgroundColor: colors.beige10,
  },
  details: {
    flexShrink: 1,
    gap: spacing[1],
  },
  name: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
