import { useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { ManageUsersButton } from "@/features/admin/ManageUsersButton";
import { errorMessage } from "@/lib/errors";
import { displayName } from "@/shared/auth";
import { AppText, Button, Screen, TextField } from "@/ui";

const CONFIRM_WORD = "DELETE";

export function AccountScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  const onDelete = async () => {
    setErr(null);
    setBusy(true);
    try {
      await deleteAccount(); // the root guard moves us to /login
    } catch (e) {
      setErr(errorMessage(e, "Could not delete the account"));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View className="gap-6 py-6">
        <View className="rounded-xl border border-white/10 bg-charcoal p-4">
          <AppText className="font-sans-semibold text-lg text-white">{displayName(user)}</AppText>
          <AppText className="mt-1 text-sm text-white/50">{user.email}</AppText>
          <View className="mt-4 gap-3">
            <ManageUsersButton />
            <Button variant="secondary" label="Log out" onPress={() => void logout()} />
          </View>
        </View>

        <View className="rounded-xl border border-loss/30 p-4">
          <AppText accessibilityRole="header" className="font-sans-semibold text-base text-white">Delete account</AppText>
          <AppText className="mt-1 text-sm text-white/50">
            Permanently deletes your account, portfolio, sale and dividend history, watchlist and alert settings. This cannot be undone.
          </AppText>
          <View className="mt-4">
            <TextField label={`Type ${CONFIRM_WORD} to confirm`} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} />
          </View>
          {err ? <AppText className="mt-3 text-xs text-loss">{err}</AppText> : null}
          <View className="mt-4">
            <Button variant="danger" label={busy ? "Deleting…" : "Delete my account"} accessibilityLabel="Delete my account" onPress={onDelete} disabled={busy || confirmText !== CONFIRM_WORD} loading={busy} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
