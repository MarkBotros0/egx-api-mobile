import { Link } from "expo-router";
import { Pressable } from "react-native";

import { AuthShell } from "@/features/auth/AuthShell";
import { LoginForm } from "@/features/auth/LoginForm";
import { AppText } from "@/ui";

export default function LoginScreen() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your portfolio and watchlist."
      footer={
        <Link href="/signup" asChild>
          <Pressable accessibilityRole="link" className="min-h-[44px] justify-center">
            <AppText className="text-sm text-white/50">New here? <AppText className="text-sm text-accent">Create an account</AppText></AppText>
          </Pressable>
        </Link>
      }
    >
      {/* Social buttons are added in Task 14 */}
      <LoginForm />
    </AuthShell>
  );
}
