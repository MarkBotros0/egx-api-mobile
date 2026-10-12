import { Link } from "expo-router";
import { Pressable } from "react-native";

import { AuthShell } from "@/features/auth/AuthShell";
import { SignupForm } from "@/features/auth/SignupForm";
import { SocialButtons } from "@/features/auth/SocialButtons";
import { AppText } from "@/ui";

export default function SignupScreen() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Track your portfolio and watchlist."
      footer={
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link" className="min-h-[44px] justify-center">
            <AppText className="text-sm text-white/50">Already have an account? <AppText className="text-sm text-accent">Sign in</AppText></AppText>
          </Pressable>
        </Link>
      }
    >
      <SocialButtons />
      <SignupForm />
    </AuthShell>
  );
}
