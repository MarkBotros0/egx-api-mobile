import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/ui";

import { AppleButton, useAppleAvailable } from "./AppleButton";
import { GoogleButton, googleAvailable } from "./GoogleButton";

/** Google (dev/store builds only) and Apple (iOS only), then an "or" divider. */
export function SocialButtons() {
  const [err, setErr] = useState<string | null>(null);
  const apple = useAppleAvailable();
  const google = googleAvailable();
  if (!apple && !google) return null;
  return (
    <View className="mb-4 gap-3">
      <AppText className="text-center text-xs text-white/40">Continue with</AppText>
      <View className="flex-row justify-center gap-4">
        {apple ? <AppleButton onError={setErr} /> : null}
        {google ? <GoogleButton onError={setErr} /> : null}
      </View>
      {err ? <AppText className="text-center text-xs text-loss">{err}</AppText> : null}
      <View className="flex-row items-center gap-3 py-1">
        <View className="h-px flex-1 bg-white/10" />
        <AppText className="text-xs text-white/30">or</AppText>
        <View className="h-px flex-1 bg-white/10" />
      </View>
    </View>
  );
}
