import type { GuardianResponse } from "@repo/shared";
import type { GuardianDraft } from "@repo/shared/client";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { fieldStyles } from "../../components/fieldStyles";
import { OptionList } from "../../components/OptionList";
import { TextField } from "../../components/TextField";
import { t } from "../../lib/messages";
import { borders, colors, fonts, fontSizes, headingLineHeight, spacing } from "../../theme/tokens";
import { ExistingGuardianPicker } from "./ExistingGuardianPicker";

type GuardianFieldsProps = {
  index: number;
  guardian: GuardianDraft;
  onChange: (guardian: GuardianDraft) => void;
  onRemove: () => void;
  errorFor: (field: string) => string | undefined;
  existingGuardians: readonly GuardianResponse[] | undefined;
  existingState: "loading" | "error" | "ready";
};

export const GuardianFields = ({
  index,
  guardian,
  onChange,
  onRemove,
  errorFor,
  existingGuardians,
  existingState,
}: GuardianFieldsProps) => {
  const number = index + 1;
  const update = (changes: Partial<GuardianDraft>) => onChange({ ...guardian, ...changes });

  const existing = () => {
    if (existingState === "loading") {
      return <Text style={fieldStyles.value}>{t("memberForm.guardiansLoading")}</Text>;
    }
    if (existingState === "error" || !existingGuardians) {
      return null;
    }
    if (existingGuardians.length === 0) {
      return <Text style={fieldStyles.value}>{t("memberForm.guardiansEmpty")}</Text>;
    }
    return (
      <ExistingGuardianPicker
        guardians={existingGuardians}
        selectedId={guardian.guardianId}
        onSelect={(guardianId) => update({ guardianId })}
        error={errorFor("guardianId")}
      />
    );
  };

  return (
    <View style={styles.guardian}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("memberForm.guardianNumber", { number })}
      </Text>
      <OptionList
        label={t("memberForm.guardianKind", { number })}
        options={[
          { value: "new", label: t("memberForm.guardianNew") },
          { value: "existing", label: t("memberForm.guardianExisting") },
        ]}
        selected={guardian.kind}
        onSelect={(kind) => update({ kind: kind === "existing" ? "existing" : "new" })}
      />
      {guardian.kind === "existing" ? (
        existing()
      ) : (
        <>
          <TextField
            label={t("memberForm.name")}
            value={guardian.name}
            onChangeText={(name) => update({ name })}
            error={errorFor("name")}
            autoCapitalize="words"
          />
          <TextField
            label={t("memberForm.surname")}
            value={guardian.surname}
            onChangeText={(surname) => update({ surname })}
            error={errorFor("surname")}
            autoCapitalize="words"
          />
          <TextField
            label={t("memberForm.email")}
            value={guardian.email}
            onChangeText={(email) => update({ email })}
            error={errorFor("email")}
            keyboardType="email-address"
            autoCapitalize="none"
            optional
          />
          <TextField
            label={t("memberForm.phone")}
            value={guardian.phone}
            onChangeText={(phone) => update({ phone })}
            error={errorFor("phone")}
            keyboardType="phone-pad"
            optional
          />
        </>
      )}
      <Button label={t("memberForm.guardianRemove", { number })} variant="secondary" onPress={onRemove} />
    </View>
  );
};

const styles = StyleSheet.create({
  guardian: {
    gap: spacing[4],
    padding: spacing[4],
    borderWidth: borders.width,
    borderColor: colors.greenDark30,
    backgroundColor: colors.beige20,
  },
  title: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.md,
    lineHeight: headingLineHeight(fontSizes.md),
  },
});
