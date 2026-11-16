import type { MemberResponse } from "@repo/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCalendarDate, formatPersonName, formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../../theme/tokens";

type MemberRowProps = {
  member: MemberResponse;
  // Without it the row cannot be tapped.
  onEdit?: (() => void) | undefined;
};

// Read by screen readers as one item; with onEdit, a tap opens the edit form.
export const MemberRow = ({ member, onEdit }: MemberRowProps) => {
  const { t } = useMessages();
  return (
    <Pressable
      onPress={onEdit}
      disabled={!onEdit}
      accessible
      accessibilityRole={onEdit ? "button" : undefined}
      accessibilityHint={onEdit ? t("members.editLabel", { name: formatPersonName(member) }) : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.nameLine}>
        <Text style={styles.name}>{formatSortedName(member)}</Text>
        {member.role === "trainer" ? <Text style={styles.label}>{t("members.trainerLabel")}</Text> : null}
      </View>
      <Text style={styles.detail}>{t("members.birthday", { date: formatCalendarDate(member.birthday) })}</Text>
      {member.email ? <Text style={styles.detail}>{member.email}</Text> : null}
      {member.phone ? <Text style={styles.detail}>{member.phone}</Text> : null}
      {member.guardians.length > 0 ? (
        <Text style={styles.detail}>
          {t("members.guardians", { names: member.guardians.map(formatPersonName).join(", ") })}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
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
  nameLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[2],
  },
  // A small tag after the name, e.g. "Trainer".
  label: {
    paddingHorizontal: spacing[2],
    backgroundColor: colors.greenLight,
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.xs,
    lineHeight: bodyLineHeight(fontSizes.xs),
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
