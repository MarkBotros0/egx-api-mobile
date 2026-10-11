import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { AppText } from "@/ui";
import { dateToIso, isoToDate } from "@/features/portfolio/logic/format";

export interface DateFieldProps {
  label: string;
  /** Local ISO date, "YYYY-MM-DD". */
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  hint?: string;
  error?: string | null;
}

export function DateField({ label, value, onChange, minimumDate, maximumDate, hint, error }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const min = minimumDate ? (isoToDate(minimumDate) ?? undefined) : undefined;
  const max = maximumDate ? (isoToDate(maximumDate) ?? undefined) : undefined;

  const handle = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === "set" && date) onChange(dateToIso(date));
  };

  return (
    <View>
      <AppText variant="label" className="mb-1">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint="Opens a date picker"
        onPress={() => setOpen((o) => !o)}
        className={`min-h-[44px] justify-center rounded-lg border bg-white/5 px-3 ${error ? "border-loss/50" : "border-white/10"}`}
      >
        <AppText className="font-mono text-base text-white">{value}</AppText>
      </Pressable>
      {open && (
        <DateTimePicker
          value={isoToDate(value) ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={min}
          maximumDate={max}
          themeVariant="dark"
          onChange={handle}
        />
      )}
      {hint ? <AppText className="mt-1 text-[10px] text-white/30">{hint}</AppText> : null}
      {error ? <AppText className="mt-1 text-xs text-loss">{error}</AppText> : null}
    </View>
  );
}
