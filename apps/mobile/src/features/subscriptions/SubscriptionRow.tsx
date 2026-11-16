import type { SubscriptionResponse } from "@repo/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney, formatNumber } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../../theme/tokens";

type SubscriptionRowProps = {
  subscription: SubscriptionResponse;
  // Without it the row is read-only.
  onEdit?: (() => void) | undefined;
};

export const SubscriptionRow = ({ subscription, onEdit }: SubscriptionRowProps) => {
  const { t } = useMessages();
  const content = (
    <>
      <Text style={styles.name}>{subscription.name}</Text>
      <Text style={styles.detail}>
        {t("subscriptions.detail", {
          count: formatNumber(subscription.sessionsPerWeek),
          price: formatMoney(subscription.price),
        })}
      </Text>
    </>
  );

  if (!onEdit) {
    return <View style={styles.row}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={t("subscriptions.editLabel", { name: subscription.name })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
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
