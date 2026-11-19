import { TextInput, View, type TextInputProps } from "react-native";
import { colors } from "../theme/tokens";
import { FieldError } from "./FieldError";
import { FieldLabel } from "./FieldLabel";
import { fieldStyles } from "./fieldStyles";

type TextFieldProps = Pick<
  TextInputProps,
  | "keyboardType"
  | "autoCapitalize"
  | "maxLength"
  | "inputMode"
  | "autoComplete"
  | "textContentType"
  | "secureTextEntry"
  | "multiline"
> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | undefined;
  optional?: boolean;
};

// Autofill is off by default: most forms are filled in for other people. The
// login form turns it back on with autoComplete and textContentType.
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
      importantForAutofill={inputProps.autoComplete && inputProps.autoComplete !== "off" ? "yes" : "no"}
      textContentType="none"
      placeholderTextColor={colors.greenDark70}
      style={[fieldStyles.control, error ? fieldStyles.controlInvalid : null]}
      {...inputProps}
    />
    <FieldError error={error} />
  </View>
);
