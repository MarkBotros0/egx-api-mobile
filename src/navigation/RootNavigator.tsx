import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { NotificationRouter } from "@/features/alerts/NotificationRouter";
import { COLORS } from "@/shared/theme";

import { BackButton } from "./BackButton";

/**
 * The app is CLOSED, like the web: nothing but /login, /signup and /forgot-password exist signed out.
 * Every route must be declared inside a guard here — a route file with no
 * matching Stack.Screen is reachable by anyone. (SDK 57 has no `redirectTo`;
 * a denied route falls back to the first screen the guards allow.)
 */
export function RootNavigator() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: COLORS["charcoal-dark"] },
    headerTintColor: "#ffffff",
    headerTitleStyle: { fontFamily: "Outfit_600SemiBold" },
    headerShadowVisible: false,
    // A bare back arrow. iOS otherwise labels it with the previous route's
    // title — "(tabs)", the route GROUP, for anything opened from a tab — and
    // iOS 26 wraps header buttons in a glass pill; the custom item hides that.
    headerBackButtonDisplayMode: "minimal",
    ...(Platform.OS === "ios"
      ? {
          headerBackVisible: false,
          unstable_headerLeftItems: ({ canGoBack }: { canGoBack?: boolean }) =>
            canGoBack ? [{ type: "custom" as const, element: <BackButton />, hidesSharedBackground: true }] : [],
        }
      : {}),
  } as const;

  // Until the stored session is restored, "signed out" is not yet known. Mounting the
  // Stack now would resolve a deep link against the signed-out guards and land on /login.
  if (isLoading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS["charcoal-dark"] } }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="stock/[symbol]" options={{ ...header, title: "" }} />
          <Stack.Screen name="compare" options={{ ...header, title: "Compare" }} />
          <Stack.Screen name="dividends" options={{ ...header, title: "Dividends" }} />
          <Stack.Screen name="calibration" options={{ ...header, title: "Calibration" }} />
          <Stack.Screen name="alerts" options={{ ...header, title: "Score alerts" }} />
          <Stack.Screen name="account" options={{ ...header, title: "Account" }} />
          <Stack.Screen name="dev/charts" options={{ ...header, title: "Chart gallery" }} />
          <Stack.Protected guard={isAdmin}>
            <Stack.Screen name="admin" options={{ ...header, title: "Users" }} />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
      </Stack>
      {isAuthenticated ? <NotificationRouter /> : null}
    </>
  );
}
