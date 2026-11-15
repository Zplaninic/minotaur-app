import { TextInput, View, type TextInputProps } from "react-native";
import { colors } from "../theme/tokens";
import { FieldError } from "./FieldError";
import { FieldLabel } from "./FieldLabel";
import { fieldStyles } from "./fieldStyles";

type TextFieldProps = Pick<TextInputProps, "keyboardType" | "autoCapitalize" | "maxLength" | "inputMode"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | undefined;
  optional?: boolean;
};

// Autofill is off: the form is filled in for other people, not for the person holding the phone.
export const TextField = ({ label, value, onChangeText, error, optional = false, ...inputProps }: TextFieldProps) => (
  <View style={fieldStyles.field}>
    <FieldLabel label={label} optional={optional} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={label}
      accessibilityHint={error}
      autoComplete="off"
      autoCorrect={false}
      importantForAutofill="no"
      textContentType="none"
      placeholderTextColor={colors.greenDark70}
      style={[fieldStyles.control, error ? fieldStyles.controlInvalid : null]}
      {...inputProps}
    />
    <FieldError error={error} />
  </View>
);
