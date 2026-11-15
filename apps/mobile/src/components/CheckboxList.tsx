import { Pressable, StyleSheet, Text, View } from "react-native";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../theme/tokens";
import { FieldError } from "./FieldError";
import { fieldStyles } from "./fieldStyles";

type Option<Value extends string> = { value: Value; label: string };

type CheckboxListProps<Value extends string> = {
  label: string;
  options: readonly Option<Value>[];
  selected: readonly Value[];
  onToggle: (value: Value) => void;
  error?: string | undefined;
};

// A short list where any number of rows can be ticked. Only for lists with a
// known small size; longer lists need a FlatList.
export const CheckboxList = <Value extends string>({
  label,
  options,
  selected,
  onToggle,
  error,
}: CheckboxListProps<Value>) => (
  <View style={fieldStyles.field} accessibilityLabel={label}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[styles.list, error ? fieldStyles.controlInvalid : null]}>
      {options.map((option, index) => {
        const checked = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityState={{ checked }}
            style={({ pressed }) => [styles.row, index > 0 && styles.divider, (checked || pressed) && styles.rowActive]}
          >
            <View style={[styles.box, checked && styles.boxChecked]} />
            <Text style={styles.text}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
    <FieldError error={error} />
  </View>
);

const styles = StyleSheet.create({
  list: {
    borderWidth: borders.width,
    borderColor: colors.greenDark60,
    backgroundColor: colors.beige10,
  },
  row: {
    minHeight: minTouchSize,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  divider: {
    borderTopWidth: borders.width,
    borderTopColor: colors.greenDark30,
  },
  rowActive: {
    backgroundColor: colors.greenDark10,
  },
  box: {
    width: spacing[4],
    height: spacing[4],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
  },
  boxChecked: {
    backgroundColor: colors.greenDark,
  },
  text: {
    flexShrink: 1,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
