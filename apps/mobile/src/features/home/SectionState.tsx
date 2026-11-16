import { toErrorCode } from "@repo/shared/client";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { useMessages } from "../../lib/messages";
import { colors } from "../../theme/tokens";
import { dashboardStyles as styles } from "./dashboardStyles";

type SectionStateProps =
  | { kind: "loading"; label: string }
  | { kind: "error"; error: unknown; onRetry: () => void };

// Loading, error and no-connection states of a home dashboard section.
export const SectionState = (props: SectionStateProps) => {
  const { errorMessage, t } = useMessages();
  if (props.kind === "loading") {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.greenDark} />
        <Text style={styles.text}>{props.label}</Text>
      </View>
    );
  }
  const code = toErrorCode(props.error);
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      {code === "NETWORK_ERROR" ? <Text style={styles.strong}>{t("dashboard.offlineTitle")}</Text> : null}
      <Text style={styles.text}>{errorMessage(code)}</Text>
      <Button label={t("common.retry")} variant="secondary" onPress={props.onRetry} />
    </View>
  );
};
