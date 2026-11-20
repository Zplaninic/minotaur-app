import { StyleSheet, Text } from "react-native";
import { useMessages } from "../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, radii, spacing } from "../theme/tokens";

// Marks a member who is new to the club.
export const NewBadge = () => {
  const { t } = useMessages();
  return <Text style={styles.badge}>{t("member.newBadge")}</Text>;
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    borderWidth: borders.width,
    borderColor: colors.greenLight,
    borderRadius: radii.pill,
    overflow: "hidden",
    backgroundColor: colors.greenLight30,
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
});
