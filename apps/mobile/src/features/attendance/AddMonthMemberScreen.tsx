import type { Month } from "@repo/shared";
import { monthRosterCandidates, toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAddMonthMember, useGroupAttendance } from "../../api/attendance";
import { useGroupMembers } from "../../api/groups";
import { Button } from "../../components/Button";
import { formatMonth, formatPersonName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { GroupMemberCandidateRow } from "../groups/GroupMemberCandidateRow";

type AddMonthMemberScreenProps = {
  groupId: string;
  month: Month;
};

// The group's members who are not on the month's roster; a tap adds one.
export const AddMonthMemberScreen = ({ groupId, month }: AddMonthMemberScreenProps) => {
  const router = useRouter();
  const groupMembers = useGroupMembers(groupId);
  const attendance = useGroupAttendance(groupId, month);
  const addMember = useAddMonthMember(groupId, month);

  if (groupMembers.isPending || attendance.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.greenDark} />
          <Text style={styles.text}>{t("monthMemberForm.membersLoading")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (groupMembers.isError || attendance.isError) {
    const code = toErrorCode(groupMembers.error ?? attendance.error);
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("monthMemberForm.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button
            label={t("common.retry")}
            variant="secondary"
            onPress={() => void Promise.all([groupMembers.refetch(), attendance.refetch()])}
          />
        </View>
      </SafeAreaView>
    );
  }

  const candidates = monthRosterCandidates(groupMembers.data.items, attendance.data.members);

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={candidates}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <GroupMemberCandidateRow
            member={item}
            accessibilityLabel={t("monthMemberForm.addLabel", {
              name: formatPersonName(item),
              month: formatMonth(month),
            })}
            onAdd={() => addMember.mutate(item.id, { onSuccess: () => router.back() })}
            disabled={addMember.isPending}
          />
        )}
        ListHeaderComponent={
          candidates.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.text}>{t("monthMemberForm.hint", { month: formatMonth(month) })}</Text>
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
            <Text style={styles.text}>{t("monthMemberForm.membersEmpty")}</Text>
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
