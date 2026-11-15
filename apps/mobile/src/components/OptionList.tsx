import { Pressable, StyleSheet, Text, View } from "react-native";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../theme/tokens";
import { FieldError } from "./FieldError";
import { fieldStyles } from "./fieldStyles";

type Option = { value: string; label: string };

type OptionListProps = {
  label: string;
  options: readonly Option[];
  selected: string;
  onSelect: (value: string) => void;
  error?: string | undefined;
};

// A short list of choices, one tappable row each. Only for lists with a known
// small size; longer lists need a FlatList.
export const OptionList = ({ label, options, selected, onSelect, error }: OptionListProps) => (
  <View style={fieldStyles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[styles.list, error ? fieldStyles.controlInvalid : null]}>
      {options.map((option, index) => {
        const checked = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked }}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              (checked || pressed) && styles.rowActive,
            ]}
          >
            <View style={[styles.dot, checked && styles.dotChecked]} />
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
  dot: {
    width: spacing[4],
    height: spacing[4],
    borderRadius: spacing[2],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
  },
  dotChecked: {
    borderWidth: spacing[1],
  },
  text: {
    flexShrink: 1,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
