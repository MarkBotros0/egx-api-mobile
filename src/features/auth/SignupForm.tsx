import { useState } from "react";
import { View } from "react-native";

import { errorMessage } from "@/lib/errors";
import { signupRequest } from "@/shared/api";
import { PASSWORD_MIN_LENGTH, looksLikeEmail } from "@/shared/auth";
import { AppText, Button, TextField } from "@/ui";

import { CheckInbox } from "./CheckInbox";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async () => {
    if (busy) return;
    setErr(null);
    if (!looksLikeEmail(email)) return setErr("Enter a valid email address.");
    if (password.length < PASSWORD_MIN_LENGTH) return setErr(`Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`);
    setBusy(true);
    try {
      await signupRequest(name.trim(), email.trim(), password);
      setSentTo(email.trim());
    } catch (e) {
      setErr(errorMessage(e, "Could not create the account"));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <View className="gap-3">
        <AppText accessibilityRole="header" className="font-sans-semibold text-base text-white">Check your inbox</AppText>
        <CheckInbox body={`We sent a link to ${sentTo}. Open it to finish creating your account, then sign in here. It works for 24 hours.`} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} returnKeyType="next" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
      <TextField label={`Password (at least ${PASSWORD_MIN_LENGTH} characters)`} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={onSubmit} />
      {err ? (
        <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
          <AppText className="text-xs text-loss">{err}</AppText>
        </View>
      ) : null}
      <Button label={busy ? "Creating…" : "Create account"} accessibilityLabel="Create account" onPress={onSubmit} disabled={busy} loading={busy} />
    </View>
  );
}
