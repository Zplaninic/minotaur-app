import { Alert } from "react-native";
import { t } from "./messages";

type ConfirmRemoveOptions = {
  title: string;
  message: string;
  onConfirm: () => void;
};

// Asks with the platform's own alert before something is removed.
export const confirmRemove = ({ title, message, onConfirm }: ConfirmRemoveOptions): void =>
  Alert.alert(title, message, [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("common.remove"), style: "destructive", onPress: onConfirm },
  ]);
