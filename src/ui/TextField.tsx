import { useId } from "react";
import { TextInput, type TextInputProps, View } from "react-native";

import { AppText } from "./AppText";

export function TextField({ label, error, className = "", ...input }: TextInputProps & { label: string; error?: string | null; className?: string }) {
  const id = useId();
  return (
    <View className="gap-1">
      <AppText variant="label" nativeID={id}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        aria-labelledby={id}
        placeholderTextColor="rgba(255,255,255,0.3)"
        className={`min-h-[44px] rounded-lg border bg-white/5 px-3 font-sans text-base text-white ${error ? "border-loss/50" : "border-white/10 focus:border-accent/50"} ${className}`}
        {...input}
      />
      {error ? <AppText className="text-xs text-loss">{error}</AppText> : null}
    </View>
  );
}
