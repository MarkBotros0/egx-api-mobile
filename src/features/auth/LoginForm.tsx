import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link } from "expo-router";

import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { LoginError, resendVerification } from "@/shared/api";
import { EMAIL_NOT_VERIFIED } from "@/shared/auth";
import { AppText, Button, TextField } from "@/ui";

export function LoginForm() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendErr, setResendErr] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setUnverified(false);
    setResent(false);
    setResendErr(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      // `error` from useAuth carries the message; unverified gets its own panel.
      if (e instanceof LoginError && e.code === EMAIL_NOT_VERIFIED) setUnverified(true);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResendErr(null);
    try {
      await resendVerification(email.trim());
      setResent(true);
    } catch (e) {
      setResendErr(errorMessage(e, "Could not send the email"));
    }
  };

  return (
    <View className="gap-4">
      <TextField
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setUnverified(false);
          setResent(false);
          setResendErr(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Link href="/forgot-password" asChild>
        <Pressable accessibilityRole="link" className="min-h-[44px] justify-center self-end">
          <AppText className="text-xs text-accent">Forgot password?</AppText>
        </Pressable>
      </Link>
      {unverified ? (
        <View className="gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
          <AppText className="text-xs text-white/80">{`Confirm your email first — we sent a link to ${email.trim()}.`}</AppText>
          {resendErr ? <AppText className="text-xs text-loss">{resendErr}</AppText> : null}
          {resent ? (
            <AppText className="font-sans-semibold text-xs text-white/80">If it doesn&apos;t arrive in a minute, check spam or try again.</AppText>
          ) : (
            <Button variant="secondary" label="Resend the link" onPress={() => void onResend()} />
          )}
        </View>
      ) : error ? (
        <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
          <AppText className="text-xs text-loss">{error}</AppText>
        </View>
      ) : null}
      <Button label={submitting ? "Signing in…" : "Sign in"} accessibilityLabel="Sign in" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
    </View>
  );
}
