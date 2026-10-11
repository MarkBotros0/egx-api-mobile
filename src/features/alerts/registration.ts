/**
 * Getting this phone's push token to the backend, and taking it back on logout.
 * Every failure here is quiet: alerts are a convenience, and nothing about
 * them may block signing in, signing out, or opening the app.
 */
import * as SecureStore from "expo-secure-store";

import { fetchAlertPreferences, registerDevice, unregisterDevice } from "./api";
import { configureNotifications, devicePlatform, getPushToken, isExpoGo, permissionStatus, requestPermission } from "./push";

export const PUSH_TOKEN_KEY = "egx.push.token";

export type EnableResult = { ok: true } | { ok: false; reason: "expo-go" | "denied" | "unavailable" | "network" };

async function registerToken(): Promise<EnableResult> {
  let token: string | null;
  try {
    token = await getPushToken();
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!token) return { ok: false, reason: "unavailable" };
  try {
    await registerDevice(token, devicePlatform());
  } catch {
    return { ok: false, reason: "network" };
  }
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch {
    // Unregister-on-logout becomes best effort; the server still prunes dead tokens.
  }
  return { ok: true };
}

/** Called when the user turns alerts ON. Asks the OS, then registers. */
export async function enableAlertsOnDevice(): Promise<EnableResult> {
  if (isExpoGo()) return { ok: false, reason: "expo-go" };
  configureNotifications();
  if ((await requestPermission()) !== "granted") return { ok: false, reason: "denied" };
  return registerToken();
}

/** On app start while signed in: tokens rotate, and last_seen should move. */
export async function syncRegistration(): Promise<void> {
  try {
    if (isExpoGo()) return;
    configureNotifications();
    const prefs = await fetchAlertPreferences();
    if (!prefs.enabled) return;
    if ((await permissionStatus()) !== "granted") return;
    await registerToken();
  } catch {
    // Quiet by design.
  }
}

/** Before the session is cleared, so the DELETE still carries the token. */
export async function unregisterOnLogout(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await unregisterDevice(token);
  } catch {
    // Quiet by design: logout must never fail because of push.
  }
}
