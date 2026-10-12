import { useState } from "react";
import { View } from "react-native";

import { errorMessage } from "@/lib/errors";
import { forgotPassword } from "@/shared/api";
import { looksLikeEmail } from "@/shared/auth";
import { AppText, Button, TextField } from "@/ui";

import { CheckInbox } from "./CheckInbox";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async () => {
    if (busy) return;
    setErr(null);
    if (!looksLikeEmail(email)) return setErr("Enter a valid email address.");
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (e) {
      setErr(errorMessage(e, "Could not send the email"));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <CheckInbox body={`If an account exists for ${sentTo}, a reset link is on its way. It works for 1 hour. Open it on this phone or any browser.`} />
    );
  }

  return (
    <View className="gap-4">
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={onSubmit} />
      {err ? (
        <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
          <AppText className="text-xs text-loss">{err}</AppText>
        </View>
      ) : null}
      <Button label={busy ? "Sending…" : "Send reset link"} accessibilityLabel="Send reset link" onPress={onSubmit} disabled={busy} loading={busy} />
    </View>
  );
}
