/**
 * Alerts endpoints. Mobile-only (the web has no push), so they live here rather
 * than in the generated src/shared/api.ts — but they read the same configured
 * base URL, token and 401 handler through getApiConfig().
 */
import { getApiConfig } from "@/shared/apiConfig";

import type { AlertPreferences } from "./options";

const TIMEOUT_MS = 10000;

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { baseUrl, getToken, onUnauthorized } = getApiConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 401) onUnauthorized();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.detail || `Request failed: ${res.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchAlertPreferences(): Promise<AlertPreferences> {
  return call("GET", "/alerts/preferences");
}

export function saveAlertPreferences(p: AlertPreferences): Promise<AlertPreferences> {
  return call("PUT", "/alerts/preferences", p);
}

export async function registerDevice(token: string, platform: "ios" | "android"): Promise<void> {
  await call("POST", "/push/devices", { token, platform });
}

export async function unregisterDevice(token: string): Promise<void> {
  await call("DELETE", `/push/devices?token=${encodeURIComponent(token)}`);
}
