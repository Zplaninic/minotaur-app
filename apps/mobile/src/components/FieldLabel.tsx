import { Text } from "react-native";
import { useMessages } from "../lib/messages";
import { fieldStyles } from "./fieldStyles";

type FieldLabelProps = {
  label: string;
  optional: boolean;
};

export const FieldLabel = ({ label, optional }: FieldLabelProps) => {
  const { t } = useMessages();
  return (
    <Text style={fieldStyles.label}>
      {label}
      {optional ? <Text style={fieldStyles.optional}> ({t("common.optional")})</Text> : null}
    </Text>
  );
};
