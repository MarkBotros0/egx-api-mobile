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
    if ((await permissionStatus()) !== "granted") return;
    // A token left on this phone by a previous user (failed logout DELETE)
    // must follow the current user, whatever their preference says.
    const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!stored && !(await fetchAlertPreferences()).enabled) return;
    await registerToken();
  } catch {
    // Quiet by design.
  }
}

/** True when this phone holds a token and may show notifications. */
export async function deviceRegistered(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    return !!token && (await permissionStatus()) === "granted";
  } catch {
    return false;
  }
}

/** Before the session is cleared, so the DELETE still carries the token. */
export async function unregisterOnLogout(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await unregisterDevice(token);
    // Only after the server confirmed: a failed DELETE leaves the token so the
    // next sign-in on this phone re-binds or retries it.
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // Quiet by design: logout must never fail because of push.
  }
}
