import { View } from "react-native";

import { AppText } from "./AppText";
import { Button } from "./Button";

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center gap-1 rounded-xl border border-white/5 bg-charcoal px-4 py-8">
      <AppText className="font-sans-semibold text-white/80">{title}</AppText>
      {body ? <AppText variant="muted" className="text-center">{body}</AppText> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="gap-3 rounded-xl border border-loss/30 bg-loss/10 p-4">
      <AppText className="text-xs text-loss">{message}</AppText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
