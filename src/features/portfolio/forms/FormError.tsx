import { View } from "react-native";
import { AppText } from "@/ui";

/** Directly above the buttons: the rejection appears where the user just tapped. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" className="rounded-lg border border-loss/30 bg-loss/10 p-3">
      <AppText className="font-sans text-xs text-loss">{message}</AppText>
    </View>
  );
}
