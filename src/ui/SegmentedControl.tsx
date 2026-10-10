import { Pressable, View } from "react-native";

import { AppText } from "./AppText";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-lg border border-white/10 bg-white/5 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            className={`min-h-[40px] flex-1 items-center justify-center rounded-md ${active ? "bg-accent/20" : ""}`}
          >
            <AppText className={`font-sans-medium text-xs ${active ? "text-accent" : "text-white/60"}`}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
