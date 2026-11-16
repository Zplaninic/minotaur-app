import { groupMemberCandidates, toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAddGroupMember, useGroupMembers } from "../../api/groups";
import { useAllMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { GroupMemberCandidateRow } from "./GroupMemberCandidateRow";

type AddGroupMemberScreenProps = {
  groupId: string;
};

export const AddGroupMemberScreen = ({ groupId }: AddGroupMemberScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const everyone = useAllMembers();
  const current = useGroupMembers(groupId);
  const addMember = useAddGroupMember(groupId);

  if (everyone.isPending || current.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.greenDark} />
          <Text style={styles.text}>{t("groupMemberForm.membersLoading")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (everyone.isError || current.isError) {
    const code = toErrorCode(everyone.error ?? current.error);
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("groupMemberForm.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button
            label={t("common.retry")}
            variant="secondary"
            onPress={() => void Promise.all([everyone.refetch(), current.refetch()])}
          />
        </View>
      </SafeAreaView>
    );
  }

  const candidates = groupMemberCandidates(everyone.data, current.data.items);

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={candidates}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <GroupMemberCandidateRow
            member={item}
            onAdd={() => addMember.mutate(item.id, { onSuccess: () => router.back() })}
            disabled={addMember.isPending}
          />
        )}
        ListHeaderComponent={
          candidates.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.text}>{t("groupMemberForm.hint")}</Text>
              {addMember.error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {errorMessage(toErrorCode(addMember.error))}
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.state}>
            <Text style={styles.text}>{t("groupMemberForm.membersEmpty")}</Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige10,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing[6],
  },
  header: {
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: borders.width,
    borderBottomColor: colors.greenDark30,
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    padding: spacing[4],
  },
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  text: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
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
