import type { GroupResponse } from "@repo/shared";
import { StyleSheet, Text, View } from "react-native";
import { bodyLineHeight, borders, colors, fonts, fontSizes, spacing } from "../../theme/tokens";
import { groupName } from "./groupName";

type GroupRowProps = {
  group: GroupResponse;
};

export const GroupRow = ({ group }: GroupRowProps) => (
  <View style={styles.row}>
    <Text style={styles.name}>{groupName(group)}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
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
});
