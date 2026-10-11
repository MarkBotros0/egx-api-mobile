/**
 * Add a user. Leaving the password blank is the intended path: the backend
 * generates a strong one and returns it once. The switch exists for when the
 * admin has already agreed a password with the person.
 *
 * Mount it only while open (like the web modal), so a second "Add user"
 * starts from an empty form rather than a stale "Creating…".
 */
import { useState } from "react";
import { Switch, View } from "react-native";
import { AppText, Button, Sheet, TextField } from "@/ui";
import { errorMessage } from "@/lib/errors";
import { V } from "@/shared/learnVisuals";
import { validateNewUser } from "./credentials";

export function CreateUserSheet({
  onCreate,
  onClose,
}: {
  onCreate: (username: string, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ownPassword, setOwnPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const invalid = validateNewUser(username, ownPassword, password);
    if (invalid) {
      setErr(invalid);
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onCreate(username.trim().toLowerCase(), ownPassword ? password : undefined);
    } catch (e: unknown) {
      setErr(errorMessage(e, "Could not create the user"));
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title="Add user">
      <View className="gap-4">
        <View>
          <TextField
            label="Username"
            accessibilityLabel="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholder="sara.b"
            className="font-mono"
          />
          <AppText className="mt-1 text-[11px] text-white/40">3–32 characters: a–z, 0–9, dot, dash or underscore.</AppText>
        </View>

        <View className="min-h-[44px] flex-row items-center justify-between gap-3">
          <AppText className="flex-1 text-sm text-white/70">Set the password myself</AppText>
          <Switch
            accessibilityLabel="Set the password myself"
            value={ownPassword}
            onValueChange={setOwnPassword}
            trackColor={{ true: V.accent, false: "rgba(255,255,255,0.15)" }}
          />
        </View>

        {ownPassword ? (
          <View>
            <TextField
              label="Password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              className="font-mono"
            />
            <AppText className="mt-1 text-[11px] text-white/40">At least 8 characters.</AppText>
          </View>
        ) : (
          <View className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <AppText className="text-xs text-white/50">A strong password will be generated and shown to you once.</AppText>
          </View>
        )}

        {err ? (
          <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
            <AppText className="text-xs text-loss">{err}</AppText>
          </View>
        ) : null}

        <View className="flex-row gap-2 pt-1">
          <View className="flex-1">
            <Button label={submitting ? "Creating…" : "Create user"} onPress={submit} loading={submitting} disabled={submitting} />
          </View>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
