/**
 * The ONLY file that touches expo-notifications / expo-device. Everything else
 * in alerts imports from here, so tests mock one module and the rest of the
 * feature stays plain TypeScript.
 *
 * Remote push needs an installed build: Expo Go cannot receive it (Android
 * since SDK 53). isExpoGo() lets the screen say so instead of failing.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const ALERT_CHANNEL_ID = "score-alerts";

/** `market`: the stock's market, sent by the backend so a US alert opens the US stock. */
export type AlertTap = { symbol: string; market?: string };

export { isExpoGo } from "@/lib/runtime";

let configured = false;
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
    name: "Score alerts",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function permissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/** Android 13+ shows no prompt until a channel exists, so the channel comes first. */
export async function requestPermission(): Promise<"granted" | "denied"> {
  await ensureChannel();
  if ((await permissionStatus()) === "granted") return "granted";
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function devicePlatform(): "ios" | "android" {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function parseTap(data: unknown): AlertTap | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { type?: unknown; symbol?: unknown; market?: unknown };
  if (d.type !== "score_alert" || typeof d.symbol !== "string" || !d.symbol) return null;
  return typeof d.market === "string" && d.market ? { symbol: d.symbol, market: d.market } : { symbol: d.symbol };
}

/**
 * The native "last response" survives sign-out and is set on every tap, so a
 * remounted router (next login) would replay it. The identifier of the last
 * notification we acted on lives here, outside React, and both paths skip it.
 */
let lastHandledId: string | null = null;
function alreadyHandled(response: Notifications.NotificationResponse): boolean {
  const id = response.notification.request.identifier;
  if (id && id === lastHandledId) return true;
  lastHandledId = id || null;
  return false;
}

export function onAlertTap(cb: (tap: AlertTap) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (alreadyHandled(response)) return;
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    const tap = parseTap(response.notification.request.content.data);
    if (tap) cb(tap);
  });
  return () => sub.remove();
}

export async function consumeColdStartTap(): Promise<AlertTap | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  await Notifications.clearLastNotificationResponseAsync();
  if (alreadyHandled(response)) return null;
  return parseTap(response.notification.request.content.data);
}
