import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { fromIsoDate, toIsoDate } from "@repo/shared/client";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useMessages } from "../lib/messages";
import { Button } from "./Button";
import { FieldError } from "./FieldError";
import { FieldLabel } from "./FieldLabel";
import { fieldStyles } from "./fieldStyles";

type DateFieldProps = {
  label: string;
  // YYYY-MM-DD, or "" when nothing is chosen yet.
  value: string;
  onChange: (value: string) => void;
  formatValue: (value: string) => string;
  placeholder: string;
  // Where the picker starts when nothing is chosen yet.
  initialDate: Date;
  maximumDate: Date;
  error?: string | undefined;
  testID?: string;
};

// Android shows the date in a system dialog; iOS shows a spinner below the field.
export const DateField = ({
  label,
  value,
  onChange,
  formatValue,
  placeholder,
  initialDate,
  maximumDate,
  error,
  testID,
}: DateFieldProps) => {
  const { t } = useMessages();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const date = value ? fromIsoDate(value) : initialDate;

  const onPicked = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === "set" && picked) {
      onChange(toIsoDate(picked));
    }
  };

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: date, mode: "date", maximumDate, onChange: onPicked });
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
          <DateTimePicker
            testID={testID}
            value={date}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            onChange={onPicked}
          />
          <Button
            label={t("common.done")}
            variant="secondary"
            onPress={() => {
              // The wheel reports only changes; Done on an untouched wheel takes the date it shows.
              if (!value) {
                onChange(toIsoDate(date));
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
