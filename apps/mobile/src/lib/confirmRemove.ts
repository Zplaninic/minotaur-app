import { Alert } from "react-native";
import { translate as t } from "./messages";

type ConfirmRemoveOptions = {
  title: string;
  message: string;
  onConfirm: () => void;
  // The destructive button's text; "Remove" when left out.
  confirmLabel?: string;
};

// Asks with the platform's own alert before something is removed. Texts are
// read when the alert opens, so they are always in the current language.
export const confirmRemove = ({
  title,
  message,
  onConfirm,
  confirmLabel = t("common.remove"),
}: ConfirmRemoveOptions): void =>
  Alert.alert(title, message, [
    { text: t("common.cancel"), style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
