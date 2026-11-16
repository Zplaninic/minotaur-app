import { toErrorCode } from "@repo/shared/client";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useMember } from "../../api/members";
import { Button } from "../../components/Button";
import { fieldStyles } from "../../components/fieldStyles";
import { Screen } from "../../components/Screen";
import { useMessages } from "../../lib/messages";
import { colors, fonts, fontSizes, headingLineHeight } from "../../theme/tokens";
import { MemberFormScreen } from "./MemberFormScreen";

type EditMemberScreenProps = {
  memberId: string;
};

// Loads the member, then shows the member form filled in.
export const EditMemberScreen = ({ memberId }: EditMemberScreenProps) => {
  const { errorMessage, t } = useMessages();
  const member = useMember(memberId);

  if (member.isPending) {
    return (
      <Screen belowHeader>
        <ActivityIndicator color={colors.greenDark} />
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {t("memberForm.loading")}
        </Text>
      </Screen>
    );
  }
  if (member.isError) {
    const code = toErrorCode(member.error);
    return (
      <Screen belowHeader>
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.title}>
            {t("memberForm.offlineTitle")}
          </Text>
        ) : null}
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage(code)}
        </Text>
        <Button label={t("common.retry")} variant="secondary" onPress={() => void member.refetch()} />
      </Screen>
    );
  }
  // Keyed by member, so the form starts from the loaded data.
  return <MemberFormScreen key={member.data.id} member={member.data} />;
};

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
});
