import type { MemberResponse } from "@repo/shared";
import { StyleSheet, Text, View } from "react-native";
import { formatCalendarDate, formatPersonName, formatSortedName } from "../../lib/format";
import { t } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, spacing } from "../../theme/tokens";

type MemberRowProps = {
  member: MemberResponse;
};

// Read by screen readers as one item.
export const MemberRow = ({ member }: MemberRowProps) => (
  <View style={styles.row} accessible>
    <Text style={styles.name}>{formatSortedName(member)}</Text>
    <Text style={styles.detail}>{t("members.birthday", { date: formatCalendarDate(member.birthday) })}</Text>
    {member.email ? <Text style={styles.detail}>{member.email}</Text> : null}
    {member.phone ? <Text style={styles.detail}>{member.phone}</Text> : null}
    {member.guardians.length > 0 ? (
      <Text style={styles.detail}>
        {t("members.guardians", { names: member.guardians.map(formatPersonName).join(", ") })}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
    backgroundColor: colors.beige10,
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
