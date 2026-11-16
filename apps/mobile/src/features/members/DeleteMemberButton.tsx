import type { MemberResponse } from "@repo/shared";
import { toErrorCode, type ClientErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAbility, useMe } from "../../api/auth";
import { useArchiveMember } from "../../api/members";
import { Button } from "../../components/Button";
import { confirmRemove } from "../../lib/confirmRemove";
import { formatPersonName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, spacing } from "../../theme/tokens";

type DeleteMemberButtonProps = {
  member: MemberResponse;
};

// The only CONFLICT here is a trainer who still leads groups.
const archiveErrorMessage = (code: ClientErrorCode): string =>
  code === "CONFLICT" ? t("memberForm.deleteOwnerConflict") : errorMessage(code);

// Asks first, then deletes the member and goes back to the list.
export const DeleteMemberButton = ({ member }: DeleteMemberButtonProps) => {
  const router = useRouter();
  const ability = useAbility();
  const me = useMe();
  const archiveMember = useArchiveMember(member.id);

  // Nobody deletes themselves; the backend refuses it too.
  if (!ability.can("delete", "Member") || member.id === me.data?.memberId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {archiveMember.error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {archiveErrorMessage(toErrorCode(archiveMember.error))}
        </Text>
      ) : null}
      <Button
        label={archiveMember.isPending ? t("common.deleting") : t("memberForm.delete")}
        variant="secondary"
        disabled={archiveMember.isPending}
        onPress={() =>
          confirmRemove({
            title: t("memberForm.deleteConfirmTitle", { name: formatPersonName(member) }),
            message: t("memberForm.deleteConfirmText"),
            confirmLabel: t("common.delete"),
            onConfirm: () => archiveMember.mutate(undefined, { onSuccess: () => router.back() }),
          })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  error: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
