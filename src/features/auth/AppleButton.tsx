import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { appleSignInRequest } from "@/shared/api";

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

  const onPress = async () => {
    onError(null);
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
    }
  };

  return (
    <View accessibilityRole="button" accessibilityLabel="Continue with Apple" className="h-11 w-full">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={8}
        style={{ width: "100%", height: 44 }}
        onPress={() => void onPress()}
      />
    </View>
  );
}
