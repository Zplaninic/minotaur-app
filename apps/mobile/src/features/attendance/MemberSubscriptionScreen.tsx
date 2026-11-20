import type { Month } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useGroupAttendance, useSetMonthPaid, useSetMonthSubscription } from "../../api/attendance";
import { useAbility } from "../../api/auth";
import { useSetMemberNew } from "../../api/members";
import { useSubscriptions } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { CheckboxList } from "../../components/CheckboxList";
import { fieldStyles } from "../../components/fieldStyles";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { formatMoney, formatMonth, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { MonthCommentForm } from "./MonthCommentForm";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight } from "../../theme/tokens";

type MemberSubscriptionScreenProps = {
  groupId: string;
  month: Month;
  memberId: string;
};

// "" in the option list stands for no subscription.
const NONE = "";

// One member's subscription, payment and comment for one month, shared by all
// their groups. Picking a subscription saves it and goes back; the paid box
// and the comment save and stay.
export const MemberSubscriptionScreen = ({ groupId, month, memberId }: MemberSubscriptionScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const attendance = useGroupAttendance(groupId, month);
  const subscriptions = useSubscriptions();
  const setSubscription = useSetMonthSubscription(groupId, month, memberId);
  const setPaid = useSetMonthPaid(groupId, month, memberId);
  const setNew = useSetMemberNew(memberId);
  const canMarkNew = useAbility().can("update", "Member");

  if (attendance.isPending || subscriptions.isPending) {
    return (
      <Screen belowHeader>
        <ActivityIndicator color={colors.greenDark} />
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {t("monthSubscriptionForm.loading")}
        </Text>
      </Screen>
    );
  }
  if (attendance.isError || subscriptions.isError) {
    const code = toErrorCode(attendance.error ?? subscriptions.error);
    return (
      <Screen belowHeader>
        {code === "NETWORK_ERROR" ? (
          <Text accessibilityRole="header" style={styles.title}>
            {t("monthSubscriptionForm.offlineTitle")}
          </Text>
        ) : null}
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage(code)}
        </Text>
        <Button
          label={t("common.retry")}
          variant="secondary"
          onPress={() => void Promise.all([attendance.refetch(), subscriptions.refetch()])}
        />
      </Screen>
    );
  }

  const member = attendance.data.members.find((item) => item.id === memberId);
  if (!member) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage("NOT_FOUND")}
        </Text>
      </Screen>
    );
  }

  const options = [
    { value: NONE, label: t("attendance.noSubscription") },
    ...subscriptions.data.items.map((subscription) => ({
      value: subscription.id,
      label: t("monthSubscriptionForm.option", { name: subscription.name, price: formatMoney(subscription.price) }),
    })),
  ];
  const selected = setSubscription.isPending
    ? (setSubscription.variables ?? NONE)
    : (member.subscription?.id ?? NONE);
  const errorCode = setSubscription.error ? toErrorCode(setSubscription.error) : undefined;
  // A paid month keeps its subscription; the server refuses with CONFLICT.
  const error =
    errorCode === "CONFLICT"
      ? t("monthSubscriptionForm.paidKeepsSubscription")
      : errorCode
        ? errorMessage(errorCode)
        : undefined;
  const paid = setPaid.isPending ? setPaid.variables : member.paid;
  const canPay = member.subscription !== null;
  const paidError = setPaid.error ? errorMessage(toErrorCode(setPaid.error)) : undefined;
  // While saving, show the value being saved rather than jumping back.
  const isNew = setNew.isPending ? setNew.variables : member.isNew;

  const onSelect = (value: string) => {
    if (!setSubscription.isPending) {
      setSubscription.mutate(value === NONE ? null : value, { onSuccess: () => router.back() });
    }
  };

  return (
    <Screen belowHeader>
      <Text style={styles.hint}>
        {t("monthSubscriptionForm.hint", { name: formatPersonName(member), month: formatMonth(month) })}
      </Text>
      <Text style={fieldStyles.value}>{t("monthSubscriptionForm.allGroups")}</Text>
      <CheckboxList
        label={t("monthSubscriptionForm.payment")}
        options={[{ value: "paid", label: t("monthSubscriptionForm.paid") }]}
        selected={paid ? ["paid"] : []}
        onToggle={() => {
          // Only a month with a subscription can be paid; unpaying is always fine.
          if (!setPaid.isPending && (canPay || paid)) {
            setPaid.mutate(!paid);
          }
        }}
        error={paidError}
      />
      {canPay ? null : <Text style={fieldStyles.value}>{t("monthSubscriptionForm.paidNeedsSubscription")}</Text>}
      {canMarkNew ? (
        <CheckboxList
          label={t("monthSubscriptionForm.newLabel")}
          options={[{ value: "new", label: t("monthSubscriptionForm.new") }]}
          selected={isNew ? ["new"] : []}
          onToggle={() => {
            if (!setNew.isPending) {
              setNew.mutate(!isNew);
            }
          }}
          error={setNew.error ? errorMessage(toErrorCode(setNew.error)) : undefined}
        />
      ) : null}
      <MonthCommentForm groupId={groupId} month={month} member={member} />
      <OptionList
        label={t("monthSubscriptionForm.label")}
        options={options}
        selected={selected}
        onSelect={onSelect}
        error={error}
      />
      {setSubscription.isPending || setPaid.isPending || setNew.isPending ? (
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {t("monthSubscriptionForm.saving")}
        </Text>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  hint: {
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
