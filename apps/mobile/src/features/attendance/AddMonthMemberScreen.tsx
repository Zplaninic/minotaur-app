import type { Month } from "@repo/shared";
import { monthRosterCandidates, toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAddMonthMember, useGroupAttendance } from "../../api/attendance";
import { useGroupMembers } from "../../api/groups";
import { useAllMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { formatMonth, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight, radii, spacing } from "../../theme/tokens";
import { GroupMemberCandidateRow } from "../groups/GroupMemberCandidateRow";
import { JoinGroupToggle } from "./JoinGroupToggle";

type AddMonthMemberScreenProps = {
  groupId: string;
  month: Month;
};

// The members who are not on the month's roster, the group's members first;
// a tap adds one. Members from outside the group can also join it.
export const AddMonthMemberScreen = ({ groupId, month }: AddMonthMemberScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const everyone = useAllMembers();
  const groupMembers = useGroupMembers(groupId);
  const attendance = useGroupAttendance(groupId, month);
  const addMember = useAddMonthMember(groupId, month);
  const [joinGroup, setJoinGroup] = useState(false);

  if (everyone.isPending || groupMembers.isPending || attendance.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.greenDark} />
          <Text style={styles.text}>{t("monthMemberForm.membersLoading")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (everyone.isError || groupMembers.isError || attendance.isError) {
    const code = toErrorCode(everyone.error ?? groupMembers.error ?? attendance.error);
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
            onPress={() => void Promise.all([everyone.refetch(), groupMembers.refetch(), attendance.refetch()])}
          />
        </View>
      </SafeAreaView>
    );
  }

  const candidates = monthRosterCandidates(everyone.data, groupMembers.data.items, attendance.data.members);
  const sections = [
    { key: "group", title: t("monthMemberForm.groupMembers"), data: candidates.filter(({ inGroup }) => inGroup) },
    { key: "others", title: t("monthMemberForm.otherMembers"), data: candidates.filter(({ inGroup }) => !inGroup) },
  ].filter((section) => section.data.length > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <SectionList
        sections={sections}
        keyExtractor={({ member }) => member.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.key === "others" ? (
              <JoinGroupToggle
                label={t("monthMemberForm.joinGroup")}
                checked={joinGroup}
                onToggle={() => setJoinGroup((checked) => !checked)}
              />
            ) : null}
          </View>
        )}
        renderItem={({ item: { member, inGroup } }) => (
          <GroupMemberCandidateRow
            member={member}
            accessibilityLabel={t("monthMemberForm.addLabel", {
              name: formatPersonName(member),
              month: formatMonth(month),
            })}
            onAdd={() =>
              addMember.mutate(
                { memberId: member.id, joinGroup: !inGroup && joinGroup },
                { onSuccess: () => router.back() },
              )
            }
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
    backgroundColor: colors.beige40,
  },
  content: {
    flexGrow: 1,
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  sectionHeader: {
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
  header: {
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  state: {
    gap: spacing[3],
    alignItems: "flex-start",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
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
    borderRadius: radii.md,
    overflow: "hidden",
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
