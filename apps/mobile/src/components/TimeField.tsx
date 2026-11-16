import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { fromTimeOfDay, toTimeOfDay } from "@repo/shared/client";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useMessages } from "../lib/messages";
import { Button } from "./Button";
import { FieldError } from "./FieldError";
import { FieldLabel } from "./FieldLabel";
import { fieldStyles } from "./fieldStyles";

type TimeFieldProps = {
  label: string;
  // HH:mm, or "" when nothing is chosen yet.
  value: string;
  onChange: (value: string) => void;
  formatValue: (value: string) => string;
  placeholder: string;
  // HH:mm where the picker starts when nothing is chosen yet.
  initialTime: string;
  error?: string | undefined;
  testID?: string;
};

// Android shows the time in a system dialog; iOS shows a spinner below the field.
export const TimeField = ({
  label,
  value,
  onChange,
  formatValue,
  placeholder,
  initialTime,
  error,
  testID,
}: TimeFieldProps) => {
  const { t } = useMessages();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const date = fromTimeOfDay(value || initialTime);

  const onPicked = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === "set" && picked) {
      onChange(toTimeOfDay(picked));
    }
  };

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: date, mode: "time", onChange: onPicked });
    } else {
      setIosPickerOpen((current) => !current);
    }
  };

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} optional={false} />
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? formatValue(value) : placeholder}`}
        accessibilityHint={error}
        style={[fieldStyles.control, error ? fieldStyles.controlInvalid : null]}
      >
        <Text style={[fieldStyles.value, value ? null : fieldStyles.placeholder]}>
          {value ? formatValue(value) : placeholder}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && iosPickerOpen ? (
        <>
          <DateTimePicker testID={testID} value={date} mode="time" display="spinner" onChange={onPicked} />
          <Button
            label={t("common.done")}
            variant="secondary"
            onPress={() => {
              // The wheel reports only changes; Done on an untouched wheel takes the time it shows.
              if (!value) {
                onChange(toTimeOfDay(date));
              }
              setIosPickerOpen(false);
            }}
          />
        </>
      ) : null}
      <FieldError error={error} />
    </View>
  );
};
