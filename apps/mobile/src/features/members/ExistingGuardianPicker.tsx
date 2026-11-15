import type { GuardianResponse } from "@repo/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { FieldError } from "../../components/FieldError";
import { fieldStyles } from "../../components/fieldStyles";
import { OptionList } from "../../components/OptionList";
import { TextField } from "../../components/TextField";
import { formatSortedName } from "../../lib/format";
import { t } from "../../lib/messages";
import { spacing } from "../../theme/tokens";

// Few enough rows to show inside the scrolling form without a FlatList.
const MAX_MATCHES = 5;

type ExistingGuardianPickerProps = {
  guardians: readonly GuardianResponse[];
  selectedId: string;
  onSelect: (guardianId: string) => void;
  error: string | undefined;
};

export const ExistingGuardianPicker = ({ guardians, selectedId, onSelect, error }: ExistingGuardianPickerProps) => {
  const [search, setSearch] = useState("");
  const selected = guardians.find((guardian) => guardian.id === selectedId);

  if (selected) {
    return (
      <View style={styles.chosen}>
        <Text style={fieldStyles.value}>{t("memberForm.guardianChosen", { name: formatSortedName(selected) })}</Text>
        <Button label={t("common.change")} variant="secondary" onPress={() => onSelect("")} />
      </View>
    );
  }

  const query = search.trim().toLocaleLowerCase();
  const matches = guardians
    .filter((guardian) => formatSortedName(guardian).toLocaleLowerCase().includes(query))
    .slice(0, MAX_MATCHES);

  return (
    <View style={styles.picker}>
      <TextField
        label={t("memberForm.guardianSearch")}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="words"
      />
      <Text style={fieldStyles.hint}>{t("memberForm.guardianSearchHint")}</Text>
      {matches.length === 0 ? (
        <Text style={fieldStyles.value}>{t("memberForm.guardianNoMatch")}</Text>
      ) : (
        <OptionList
          label={t("memberForm.guardianExisting")}
          options={matches.map((guardian) => ({ value: guardian.id, label: formatSortedName(guardian) }))}
          selected={selectedId}
          onSelect={onSelect}
        />
      )}
      <FieldError error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  picker: {
    gap: spacing[2],
  },
  chosen: {
    gap: spacing[2],
    alignItems: "flex-start",
  },
});
