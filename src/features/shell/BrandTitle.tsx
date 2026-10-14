import { View } from "react-native";

import { AppText } from "@/ui";

/** The web navbar's wordmark: "Borsa" in accent, "Compass" quieter. */
export function BrandTitle() {
  return (
    <View accessibilityRole="header" accessibilityLabel="Borsa Compass" className="flex-row items-baseline gap-1.5">
      <AppText className="font-sans-bold text-xl text-accent">Borsa</AppText>
      <AppText className="font-sans-medium text-base text-white/70">Compass</AppText>
    </View>
  );
}
