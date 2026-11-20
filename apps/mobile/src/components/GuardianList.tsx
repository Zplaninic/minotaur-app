import type { GuardianResponse } from "@repo/shared";
import { StyleSheet, Text, View } from "react-native";
import { formatPersonName } from "../lib/format";
import { useMessages } from "../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, spacing } from "../theme/tokens";

type GuardianListProps = {
  guardians: readonly GuardianResponse[];
};

// Each guardian's name, with their email below when they have one. Nothing without guardians.
export const GuardianList = ({ guardians }: GuardianListProps) => {
  const { t } = useMessages();
  if (guardians.length === 0) {
    return null;
  }
  return (
    <View style={styles.list}>
      <Text style={styles.label}>{t("members.guardians")}</Text>
      {guardians.map((guardian) => (
        <View key={guardian.id}>
          <Text style={styles.detail}>{formatPersonName(guardian)}</Text>
          {guardian.email ? <Text style={styles.detail}>{guardian.email}</Text> : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[1],
  },
  label: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
  detail: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
