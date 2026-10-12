import { useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { isExpoGo } from "@/lib/runtime";
import { googleSignInRequest } from "@/shared/api";
import { Button } from "@/ui";

// Read at call time (not module load) so the values follow the environment.
const webClientId = () => process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const iosClientId = () => process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/**
 * On iOS the native SDK also needs the iOS client id AND its reversed-id URL
 * scheme in the build (app.config.ts adds it from GOOGLE_IOS_URL_SCHEME);
 * without the scheme GoogleSignIn raises a native exception on tap that no JS
 * catch can stop. So no iOS client id, no button.
 */
export function googleAvailable(): boolean {
  if (!webClientId() || isExpoGo()) return false;
  return Platform.OS !== "ios" || !!iosClientId();
}

type GoogleModule = typeof import("@react-native-google-signin/google-signin");

let configured = false;
function google(): GoogleModule {
  // Required lazily: the module resolves its native side with
  // TurboModuleRegistry.getEnforcing at import time, which throws in Expo Go,
  // so a top-level import would crash the login screen there.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: GoogleModule = require("@react-native-google-signin/google-signin");
  if (!configured) {
    mod.GoogleSignin.configure({ webClientId: webClientId(), iosClientId: iosClientId() || undefined });
    configured = true;
  }
  return mod;
}

export function GoogleButton({ onError }: { onError: (msg: string | null) => void }) {
  const { completeSignIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    onError(null);
    setBusy(true);
    // Assigned inside the try: require/configure may be what throws, and the catch must not call google() again.
    let mod: GoogleModule | null = null;
    try {
      mod = google();
      await mod.GoogleSignin.hasPlayServices();
      const res = await mod.GoogleSignin.signIn();
      if (!mod.isSuccessResponse(res)) return; // cancelled
      const idToken = res.data.idToken;
      if (!idToken) throw new Error("Google did not return an ID token.");
      await completeSignIn(await googleSignInRequest(idToken, res.data.user.name ?? ""));
    } catch (e) {
      if (mod?.isErrorWithCode(e) && e.code === mod.statusCodes.SIGN_IN_CANCELLED) return;
      onError(errorMessage(e, "Google sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  return <Button variant="secondary" label={busy ? "Signing in…" : "Continue with Google"} accessibilityLabel="Continue with Google" onPress={onPress} disabled={busy} loading={busy} />;
}
