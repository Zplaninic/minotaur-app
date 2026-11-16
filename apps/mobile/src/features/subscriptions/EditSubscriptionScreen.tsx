import { toErrorCode } from "@repo/shared/client";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useSubscriptions } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { fieldStyles } from "../../components/fieldStyles";
import { Screen } from "../../components/Screen";
import { errorMessage, t } from "../../lib/messages";
import { colors, fonts, fontSizes, headingLineHeight } from "../../theme/tokens";
import { SubscriptionFormScreen } from "./SubscriptionFormScreen";

type EditSubscriptionScreenProps = {
  subscriptionId: string;
};

// Finds the subscription in the list, which is short and usually cached from
// the screen before, then shows the form filled in.
export const EditSubscriptionScreen = ({ subscriptionId }: EditSubscriptionScreenProps) => {
  const subscriptions = useSubscriptions();

  if (subscriptions.isPending) {
    return (
      <Screen belowHeader>
        <ActivityIndicator color={colors.greenDark} />
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {t("subscriptionForm.loading")}
        </Text>
      </Screen>
    );
  }
  if (subscriptions.isError) {
    const code = toErrorCode(subscriptions.error);
    return (
      <Screen belowHeader>
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.title}>
            {t("subscriptionForm.offlineTitle")}
          </Text>
        ) : null}
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage(code)}
        </Text>
        <Button label={t("common.retry")} variant="secondary" onPress={() => void subscriptions.refetch()} />
      </Screen>
    );
  }

  const subscription = subscriptions.data.items.find((item) => item.id === subscriptionId);
  if (!subscription) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage("NOT_FOUND")}
        </Text>
      </Screen>
    );
  }
  // Keyed by subscription, so the form starts from the loaded data.
  return <SubscriptionFormScreen key={subscription.id} subscription={subscription} />;
};

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
});
