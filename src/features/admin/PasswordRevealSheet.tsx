/**
 * Shows a generated password exactly once. The backend stores only the
 * bcrypt hash, so this really is the only time it can be displayed — the
 * copy says so. Dismissing by swipe/back before anything was copied asks
 * first; "Done" is the explicit, unquestioned exit.
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { AppText, Button, Sheet, confirm } from "@/ui";
import { buildCredentialMessage } from "./credentials";

function Row({ label, value, divider }: { label: string; value: string; divider?: "top" | "bottom" }) {
  const border = divider === "top" ? "mt-2 border-t border-white/10 pt-2" : divider === "bottom" ? "mb-2 border-b border-white/10 pb-2" : "";
  return (
    <View className={`flex-row gap-2 ${border}`}>
      <AppText className="w-[70px] text-xs text-white/40">{label}</AppText>
      <AppText selectable className="flex-1 font-mono text-sm text-white">{value}</AppText>
    </View>
  );
}

export function PasswordRevealSheet({
  username,
  password,
  appUrl,
  onClose,
}: {
  username: string;
  password: string;
  /** feBaseUrl(); "" when not configured. */
  appUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"all" | "password" | null>(null);
  const [everCopied, setEverCopied] = useState(false);
  const message = buildCredentialMessage(appUrl, username, password);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async (text: string, which: "all" | "password") => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(which);
      setEverCopied(true);
    } catch {
      // Every value is on screen and selectable, so this is not a dead end.
      setCopied(null);
    }
  };

  const dismiss = async () => {
    if (everCopied) {
      onClose();
      return;
    }
    const ok = await confirm({
      title: "Close without copying?",
      message: "The password cannot be shown again. If it is lost, generate a new one.",
      confirmLabel: "Close",
      destructive: true,
    });
    if (ok) onClose();
  };

  return (
    <Sheet visible onClose={dismiss} title="Login details">
      <AppText className="text-sm text-white/50">
        Copy these now — the password cannot be shown again. If it is lost, generate a new one.
      </AppText>

      {/* Mirrors the copied text exactly, so what is sent matches what was checked. */}
      <View className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
        {appUrl ? <Row label="Link" value={appUrl} divider="bottom" /> : null}
        <Row label="Username" value={username} />
        <Row label="Password" value={password} divider="top" />
      </View>
      {appUrl ? null : (
        <AppText className="mt-2 text-[11px] text-white/40">
          No app link is configured (EXPO_PUBLIC_FE_BASE_URL), so the copied text has no address — send it separately.
        </AppText>
      )}

      <View className="mt-4 gap-2">
        <Button
          label={copied === "all" ? "Copied" : "Copy link, username & password"}
          onPress={() => copyText(message, "all")}
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="secondary"
              label={copied === "password" ? "Copied" : "Copy password only"}
              onPress={() => copyText(password, "password")}
            />
          </View>
          <Button variant="secondary" label="Done" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
