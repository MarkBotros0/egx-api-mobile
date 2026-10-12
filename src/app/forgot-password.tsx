import { Link } from "expo-router";
import { Pressable } from "react-native";

import { AuthShell } from "@/features/auth/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { AppText } from "@/ui";

export default function ForgotPasswordScreen() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link" className="min-h-[44px] justify-center">
            <AppText className="text-sm text-accent">Back to sign in</AppText>
          </Pressable>
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
