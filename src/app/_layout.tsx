import "../../global.css";

import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { AppProviders } from "@/providers/AppProviders";
import { RootNavigator } from "@/navigation/RootNavigator";
import { APP_FONTS } from "@/ui/fonts";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <BootGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Nothing renders until fonts are loaded AND the stored session has been
 * restored or ruled out. Without this, a signed-in person sees the login
 * screen flash on every cold start (the guard can't tell "not checked yet"
 * from "checked, signed out").
 */
function BootGate() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const { isLoading } = useAuth();
  const ready = (fontsLoaded || !!fontError) && !isLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
