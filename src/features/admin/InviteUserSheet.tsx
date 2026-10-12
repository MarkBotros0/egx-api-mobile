/**
 * Invite a person by email. The backend creates the account and emails them a
 * link to choose their password (valid 7 days), so there is no password field.
 *
 * The parent remounts it (new `key`) on every open, so a second "Invite user"
 * starts from an empty form rather than a stale "Sending…".
 */
import { useState } from "react";
import { View } from "react-native";
import { AppText, Button, Sheet, TextField } from "@/ui";
import { errorMessage } from "@/lib/errors";
import { looksLikeEmail } from "@/shared/auth";

export function InviteUserSheet({
  onInvite,
  onClose,
  visible = true,
  onDismiss,
}: {
  onInvite: (email: string, name: string) => Promise<void>;
  onClose: () => void;
  /** False while it animates out; the parent keeps it mounted until onDismiss. */
  visible?: boolean;
  onDismiss?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!looksLikeEmail(email.trim())) {
      setErr("Enter a valid email address.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onInvite(email.trim(), name.trim());
    } catch (e: unknown) {
      setErr(errorMessage(e, "Could not send the invitation"));
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss} title="Invite user">
      <View className="gap-4">
        <TextField
          label="Email"
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          placeholder="sara@example.com"
        />
        <TextField
          label="Name (optional)"
          accessibilityLabel="Name (optional)"
          value={name}
          onChangeText={setName}
          autoCorrect={false}
          autoComplete="off"
        />
        <AppText className="text-[11px] text-white/40">
          They get an email with a link to choose their password. The link works for 7 days.
        </AppText>

        {err ? (
          <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
            <AppText className="text-xs text-loss">{err}</AppText>
          </View>
        ) : null}

        <View className="flex-row gap-2 pt-1">
          <View className="flex-1">
            <Button label={submitting ? "Sending…" : "Send invitation"} onPress={submit} loading={submitting} disabled={submitting} />
          </View>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
