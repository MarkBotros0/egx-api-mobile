import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { appleSignInRequest } from "@/shared/api";

import { ProviderIconButton } from "./ProviderIconButton";

export function useAppleAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let live = true;
    AppleAuthentication.isAvailableAsync().then((ok) => live && setAvailable(ok)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return available;
}

export function AppleButton({ onError }: { onError: (msg: string | null) => void }) {
  const { completeSignIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    onError(null);
    setBusy(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!cred.identityToken) throw new Error("Apple did not return a token.");
      // Apple shares the name only on the FIRST sign-in, and never in the token.
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ");
      await completeSignIn(
        await appleSignInRequest({ identityToken: cred.identityToken, authorizationCode: cred.authorizationCode, name })
      );
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      onError(errorMessage(e, "Apple sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  // Our own button rather than AppleAuthenticationButton, whose label follows
  // the phone's language; signInAsync works the same from any button.
  return <ProviderIconButton provider="apple" label="Continue with Apple" busy={busy} onPress={() => void onPress()} />;
}
