import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText, Screen } from "@/ui";

/** The signed-out card: login, sign-up and forgot-password share it. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Screen edges={["top", "bottom"]} contentClassName="flex-grow justify-center">
      <View className="rounded-2xl border border-white/10 bg-charcoal p-6">
        <View className="mb-6 items-center">
          <AppText variant="title" accessibilityRole="header">{title}</AppText>
          {subtitle ? <AppText variant="muted" className="mt-1 text-center">{subtitle}</AppText> : null}
        </View>
        {children}
        {footer ? <View className="mt-6 items-center">{footer}</View> : null}
      </View>
    </Screen>
  );
}
