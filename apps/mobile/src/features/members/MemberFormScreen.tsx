import { ADULT_AGE, type MemberResponse } from "@repo/shared";
import { isLoginRole } from "@repo/shared/auth";
import {
  emptyMemberDraft,
  memberDraftFrom,
  newGuardianDraft,
  toErrorCode,
  toUpdateMemberBody,
  validateMemberDraft,
  type GuardianDraft,
  type MemberDraft,
  type MemberFieldError,
} from "@repo/shared/client";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGuardians } from "../../api/guardians";
import { useCreateMember, useUpdateMember } from "../../api/members";
import { useOrgs } from "../../api/orgs";
import { Button } from "../../components/Button";
import { DateField } from "../../components/DateField";
import { FieldError } from "../../components/FieldError";
import { fieldStyles } from "../../components/fieldStyles";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { confirmRemove } from "../../lib/confirmRemove";
import { formatCalendarDate } from "../../lib/format";
import { memberFieldErrorKey, useMessages } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, headingLineHeight, radii, spacing } from "../../theme/tokens";
import { DeleteMemberButton } from "./DeleteMemberButton";
import { GuardianFields } from "./GuardianFields";

// Where the birthday picker starts: an adult member is the common case.
const yearsAgo = (today: Date, years: number) => new Date(today.getFullYear() - years, 0, 1);

type MemberFormScreenProps = {
  // Set to edit this member; without it the screen adds a new one.
  member?: MemberResponse;
  // Where a new member goes once saved; by default the screen closes.
  onCreated?: (created: MemberResponse) => void;
};

export const MemberFormScreen = ({ member, onCreated }: MemberFormScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const orgs = useOrgs();
  const guardians = useGuardians();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember(member?.id ?? "");
  const saving = member ? updateMember : createMember;
  const [draft, setDraft] = useState<MemberDraft>(() => (member ? memberDraftFrom(member) : emptyMemberDraft));
  const [submitted, setSubmitted] = useState(false);
  // Fixed for the life of the form, so the minor check does not change while typing.
  const [today] = useState(() => new Date());
  // React list keys for guardian entries; crypto.randomUUID is not available in React Native.
  const nextGuardianKey = useRef(0);

  // With a single club there is nothing to choose, so it is preselected.
  const onlyOrg = orgs.data?.items.length === 1 ? orgs.data.items[0] : undefined;
  const effectiveDraft: MemberDraft = { ...draft, orgId: draft.orgId || (onlyOrg?.id ?? "") };
  // A trainer or admin logs in with their email, so it cannot be cleared.
  const emailRequired = member !== undefined && isLoginRole(member.role);
  const validation = validateMemberDraft(effectiveDraft, today, { emailRequired });
  const errors = submitted && !validation.ok ? validation.errors : {};
  const serverCode = saving.error ? toErrorCode(saving.error) : undefined;

  const message = (code: MemberFieldError | undefined) =>
    code ? t(memberFieldErrorKey(code), { age: ADULT_AGE }) : undefined;
  const fieldError = (path: string) => message(errors[path]);
  // A new member has no login, so a conflict is the tax number. An edited one
  // may be a trainer whose login email is taken.
  const taxNumberError =
    fieldError("taxNumber") ??
    (serverCode === "CONFLICT" && !member ? t("memberForm.error.taxNumberTaken") : undefined);
  const formError =
    serverCode === "CONFLICT"
      ? member
        ? t("memberForm.error.taken")
        : undefined
      : serverCode
        ? errorMessage(serverCode)
        : undefined;

  const update = (changes: Partial<MemberDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const updateGuardian = (index: number, guardian: GuardianDraft) =>
    setDraft((current) => ({ ...current, guardians: current.guardians.map((existing, i) => (i === index ? guardian : existing)) }));
  const removeGuardian = (index: number) =>
    setDraft((current) => ({ ...current, guardians: current.guardians.filter((_, i) => i !== index) }));
  const addGuardian = () => {
    setDraft((current) => ({ ...current, guardians: [...current.guardians, newGuardianDraft(`guardian-${nextGuardianKey.current++}`)] }));
    // An empty guardian should not open with errors; they show again on the next save.
    setSubmitted(false);
  };

  const save = () => {
    setSubmitted(true);
    if (!validation.ok) {
      return;
    }
    if (member) {
      updateMember.mutate(toUpdateMemberBody(validation.body), { onSuccess: () => router.back() });
    } else {
      createMember.mutate(validation.body, { onSuccess: (created) => (onCreated ? onCreated(created) : router.back()) });
    }
  };

  if (orgs.isPending) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value}>{t("memberForm.orgsLoading")}</Text>
      </Screen>
    );
  }
  if (orgs.isError) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage(toErrorCode(orgs.error))}
        </Text>
        <Button label={t("common.retry")} onPress={() => void orgs.refetch()} />
      </Screen>
    );
  }
  if (orgs.data.items.length === 0) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value}>{t("memberForm.orgsEmpty")}</Text>
      </Screen>
    );
  }

  const guardiansState = guardians.isPending ? "loading" : guardians.isError ? "error" : "ready";

  return (
    <Screen belowHeader>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("memberForm.member")}
        </Text>
        {onlyOrg || member ? null : (
          <OptionList
            label={t("memberForm.org")}
            options={orgs.data.items.map((org) => ({ value: org.id, label: org.name }))}
            selected={effectiveDraft.orgId}
            onSelect={(orgId) => update({ orgId })}
            error={fieldError("orgId")}
          />
        )}
        <TextField
          label={t("memberForm.name")}
          value={draft.name}
          onChangeText={(name) => update({ name })}
          error={fieldError("name")}
          autoCapitalize="words"
        />
        <TextField
          label={t("memberForm.surname")}
          value={draft.surname}
          onChangeText={(surname) => update({ surname })}
          error={fieldError("surname")}
          autoCapitalize="words"
        />
        <DateField
          testID="birthday-picker"
          label={t("memberForm.birthday")}
          value={draft.birthday}
          onChange={(birthday) => update({ birthday })}
          formatValue={formatCalendarDate}
          placeholder={t("memberForm.birthdayPlaceholder")}
          initialDate={yearsAgo(today, ADULT_AGE * 2)}
          maximumDate={today}
          error={fieldError("birthday")}
        />
        <TextField
          label={t("memberForm.taxNumber")}
          value={draft.taxNumber}
          onChangeText={(taxNumber) => {
            update({ taxNumber });
            saving.reset();
          }}
          error={taxNumberError}
          keyboardType="number-pad"
          maxLength={11}
          optional
        />
        <TextField
          label={t("memberForm.email")}
          value={draft.email}
          onChangeText={(email) => update({ email })}
          error={fieldError("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          optional={!emailRequired}
        />
        <TextField
          label={t("memberForm.phone")}
          value={draft.phone}
          onChangeText={(phone) => update({ phone })}
          error={fieldError("phone")}
          keyboardType="phone-pad"
          optional
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("memberForm.guardians")}
        </Text>
        <Text style={fieldStyles.hint}>{t("memberForm.guardiansHint", { age: ADULT_AGE })}</Text>
        {guardians.isError && draft.guardians.some((guardian) => guardian.kind === "existing") ? (
          <Text style={fieldStyles.value}>{errorMessage(toErrorCode(guardians.error))}</Text>
        ) : null}
        {draft.guardians.map((guardian, index) => (
          <GuardianFields
            key={guardian.key}
            index={index}
            guardian={guardian}
            onChange={(changed) => updateGuardian(index, changed)}
            onRemove={() =>
              confirmRemove({
                title: t("memberForm.guardianRemoveConfirmTitle", { number: index + 1 }),
                message: t("memberForm.guardianRemoveConfirmText"),
                onConfirm: () => removeGuardian(index),
              })
            }
            errorFor={(field) => fieldError(`guardians.${index}.${field}`)}
            existingGuardians={guardians.data?.items}
            existingState={guardiansState}
          />
        ))}
        <FieldError error={fieldError("guardians")} />
        <Button label={t("memberForm.guardianAdd")} variant="secondary" onPress={addGuardian} />
      </View>

      {formError ? (
        <Text style={styles.formError} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}

      <Button
        label={
          saving.isPending ? t("memberForm.submitting") : t(member ? "memberForm.saveChanges" : "memberForm.submit")
        }
        onPress={save}
        disabled={saving.isPending}
      />
      {member ? <DeleteMemberButton member={member} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing[4],
  },
  sectionTitle: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.lg,
    lineHeight: headingLineHeight(fontSizes.lg),
  },
  formError: {
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
