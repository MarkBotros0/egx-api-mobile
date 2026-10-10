import { View } from "react-native";

import { LoginForm } from "@/features/auth/LoginForm";
import { AppText, Screen } from "@/ui";

export default function LoginScreen() {
  return (
    <Screen edges={["top", "bottom"]} contentClassName="flex-grow justify-center">
      <View className="rounded-2xl border border-white/10 bg-charcoal p-6">
        <View className="mb-6 items-center">
          <AppText variant="title">Sign in</AppText>
          <AppText variant="muted" className="mt-1">
            Access your portfolio and watchlist.
          </AppText>
        </View>
        <LoginForm />
      </View>
    </Screen>
  );
}
