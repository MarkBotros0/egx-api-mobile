import { View } from "react-native";

import { AppText } from "@/ui";

export function CheckInbox({ body }: { body: string }) {
  return (
    <View accessibilityRole="summary" className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-3">
      <AppText className="text-sm text-white/80">{body}</AppText>
    </View>
  );
}
