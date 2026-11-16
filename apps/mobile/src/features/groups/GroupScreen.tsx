import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAbility } from "../../api/auth";
import { useGroup, useGroupMembers, useRemoveGroupMember } from "../../api/groups";
import { Button } from "../../components/Button";
import { errorMessage, t } from "../../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { GroupMemberRow } from "./GroupMemberRow";
import { groupName } from "./groupName";

type GroupScreenProps = {
  groupId: string;
};

export const GroupScreen = ({ groupId }: GroupScreenProps) => {
  const router = useRouter();
  const ability = useAbility();
  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const canChange = ability.can("update", "Group");
  const refetch = () => void Promise.all([group.refetch(), members.refetch()]);

  if (group.isPending || members.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.greenDark} />
          <Text style={styles.text}>{t("group.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (group.isError || members.isError) {
    const code = toErrorCode(group.error ?? members.error);
    return (
      <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
        <View style={styles.state} accessibilityLiveRegion="polite">
          {code === "NETWORK_ERROR" ? (
            <Text accessibilityRole="header" style={styles.title}>
              {t("group.offlineTitle")}
            </Text>
          ) : null}
          <Text style={styles.text}>{errorMessage(code)}</Text>
          <Button label={t("common.retry")} variant="secondary" onPress={refetch} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "bottom", "left"]}>
      <FlatList
        data={members.data.items}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <GroupMemberRow
            member={item}
            onRemove={canChange ? () => removeMember.mutate(item.id) : undefined}
            disabled={removeMember.isPending}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {groupName(group.data)}
            </Text>
            {ability.can("read", "Attendance") ? (
              <Button
                label={t("group.attendance")}
                onPress={() => router.push({ pathname: "/groups/[id]/attendance", params: { id: groupId } })}
              />
            ) : null}
            <Text accessibilityRole="header" style={styles.subtitle}>
              {t("groupMembers.title")}
            </Text>
            {canChange ? (
              <Button
                label={t("groupMembers.add")}
                onPress={() => router.push({ pathname: "/groups/[id]/add-member", params: { id: groupId } })}
              />
            ) : null}
            {removeMember.error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {errorMessage(toErrorCode(removeMember.error))}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.state}>
            <Text style={styles.text}>{t("groupMembers.empty")}</Text>
          </View>
        }
        refreshing={group.isRefetching || members.isRefetching}
        onRefresh={refetch}
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
  subtitle: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
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
